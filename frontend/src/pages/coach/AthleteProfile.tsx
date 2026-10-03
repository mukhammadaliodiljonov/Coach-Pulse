import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { describeError } from '../../api/client'
import { LoadBarChart } from '../../components/charts/LoadBarChart'
import { ActionChoice } from '../../components/ui/ActionChoice'
import { AuditFeed } from '../../components/ui/AuditFeed'
import { Avatar } from '../../components/ui/Avatar'
import { Button, ButtonLink } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { formatScore, isDeviating, isLoadElevated } from '../../domain/signals'
import { SYMPTOMS, type Athlete, type CoachAction, type RecoveryMetric } from '../../domain/types'
import { cx } from '../../lib/cx'
import { useTitle } from '../../lib/useTitle'
import { paths, type Origin, type ProfileLinkState } from '../../navigation/paths'
import { useCoachStore } from '../../state/coachStore'
import ui from '../../styles/ui.module.css'
import styles from './AthleteProfile.module.css'

const BACK_LABELS: Record<Origin, string> = {
  overview: 'Back to overview',
  athletes: 'Back to athletes',
  alerts: 'Back to alerts',
  alert: 'Back to alert',
}

export function AthleteProfile() {
  const { athleteId } = useParams()
  const { athlete } = useCoachStore()
  const a = athlete(athleteId)
  const navigate = useNavigate()
  const from = (useLocation().state as ProfileLinkState | null)?.from
  useTitle(a?.name ?? 'Athlete not found')

  const back = (
    <button
      type="button"
      className={ui.backButton}
      onClick={() => (from ? navigate(-1) : navigate(paths.athletes()))}
    >
      <Icon name="back" size={12} />
      {BACK_LABELS[from ?? 'athletes']}
    </button>
  )

  if (!a) {
    return (
      <div className={ui.page}>
        {back}
        <div className={ui.empty}>
          <span className={ui.emptyTitle}>Athlete not found</span>
          <span className={ui.emptyText}>They may have left the team, or the link is out of date.</span>
          <ButtonLink to={paths.athletes()} size="md" variant="outline">
            View all athletes
          </ButtonLink>
        </div>
      </div>
    )
  }

  return (
    <div className={ui.page}>
      {back}
      <ProfileHeader athlete={a} />
      <div className={styles.columns}>
        <div className={styles.stack}>
          <WhyFlagged athlete={a} />
          <ReportedSymptoms athlete={a} />
        </div>
        <div className={styles.stack}>
          <PersonalBaseline athlete={a} />
          <Recovery athlete={a} />
        </div>
      </div>
      <TrainingLoad athlete={a} />
      <div className={styles.columns}>
        <CoachActionForm key={a.id} athlete={a} />
        <FollowUpHistory athlete={a} />
      </div>
    </div>
  )
}

function ProfileHeader({ athlete: a }: { athlete: Athlete }) {
  const { actions, openRecordAction } = useCoachStore()
  const action = actions[a.id]
  const facts = [
    a.position,
    a.age === null ? null : `Age ${a.age}`,
    `Last check-in ${a.checkedInAt ? `today, ${a.checkedInAt}` : 'pending'}`,
  ].filter((fact): fact is string => fact !== null)
  return (
    <header className={styles.header}>
      <Avatar initials={a.initials} size={72} status={a.status} />
      <div className={styles.identity}>
        <h1 className={styles.name}>{a.name}</h1>
        <div className={styles.meta}>
          {facts.map((fact, i) => (
            <span key={fact} className={styles.fact}>
              {i > 0 && <span aria-hidden="true">·</span>}
              {fact}
            </span>
          ))}
        </div>
      </div>
      <div className={styles.statusColumn}>
        <StatusBadge status={a.status} size="lg" />
        {action && <span className={ui.actionRecorded}>Action recorded · {action}</span>}
      </div>
      <Button size="md" onClick={() => openRecordAction(a.id)}>
        Record action
      </Button>
    </header>
  )
}

function WhyFlagged({ athlete: a }: { athlete: Athlete }) {
  const [open, setOpen] = useState(true)
  const count = a.signals.length
  return (
    <section aria-labelledby="why-title" className={ui.card}>
      <div className={styles.cardHead}>
        <div className={cx(ui.titleBlock, styles.grow)}>
          <h2 id="why-title" className={ui.cardTitle}>
            Why is {a.firstName} flagged?
          </h2>
          <span className={ui.caption}>
            {count ? `${count} ${count === 1 ? 'signal' : 'signals'} detected` : 'No signals detected'}
          </span>
        </div>
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={open}
          aria-controls="why-body"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? 'Hide' : 'Why flagged?'}
        </button>
      </div>
      {open && (
        <div id="why-body" className={styles.stack} style={{ gap: 14 }}>
          {a.status === 'normal' &&
            (!a.baseline ? (
              <p className={styles.quiet}>
                {a.firstName}’s baseline is still forming. Until there are 7–14 days of check-ins, only safety symptoms
                are flagged.
              </p>
            ) : !a.checkedInAt ? (
              <p className={styles.quiet}>No check-in yet today.</p>
            ) : (
              <div className={styles.withinRange}>
                <StatusBadge status="normal" iconOnly iconSize={22} />
                Within usual range — no notable deviation detected.
              </div>
            ))}
          {a.signals.map((s) => (
            <div key={s.kind} className={styles.signal} data-level={s.level}>
              <StatusBadge status={s.level} iconOnly iconSize={22} className={styles.signalBadge} />
              <div className={styles.signalText}>
                <span className={styles.signalKind}>{s.kind}</span>
                <span className={styles.signalTitle}>{s.title}</span>
                <span className={styles.signalDetail}>{s.detail}</span>
              </div>
            </div>
          ))}
          {a.baseline && (
            <p className={ui.footnote}>
              Compared with {a.firstName}’s own check-ins over the last 21 days — not a fixed team or medical threshold.
            </p>
          )}
        </div>
      )}
    </section>
  )
}

function ReportedSymptoms({ athlete: a }: { athlete: Athlete }) {
  const { openRecordAction } = useCoachStore()
  const reported = a.symptoms.length > 0
  return (
    <section aria-labelledby="symptoms-title" className={cx(ui.card, styles.symptomsCard)} data-reported={reported}>
      <div className={styles.cardHead} style={{ flexWrap: 'wrap' }}>
        <h2 id="symptoms-title" className={cx(ui.cardTitle, styles.grow)}>
          Reported symptoms
        </h2>
        <span className={ui.caption}>Today’s safety check</span>
      </div>
      <div className={styles.symptoms}>
        {SYMPTOMS.map((symptom) => {
          const isReported = a.symptoms.includes(symptom)
          return (
            <div key={symptom} className={styles.symptom} data-reported={isReported}>
              <StatusBadge status={isReported ? 'high' : 'normal'} iconOnly iconSize={18} />
              <div className={styles.symptomText}>
                <span className={styles.symptomName}>{isReported ? symptom : `No ${symptom.toLowerCase()}`}</span>
                <span className={styles.symptomSub}>
                  {!isReported
                    ? 'Not reported'
                    : a.checkedInAt
                      ? `Reported today, ${a.checkedInAt}`
                      : a.symptomNote || 'Reported'}
                </span>
              </div>
            </div>
          )
        })}
      </div>
      <p className={styles.disclaimer}>
        Symptoms reported by the athlete. CoachPulse does not diagnose medical conditions — follow your organization’s
        health and safety protocol.
      </p>
      {reported && (
        <div>
          <Button size="sm" onClick={() => openRecordAction(a.id)}>
            Record follow-up
          </Button>
        </div>
      )}
    </section>
  )
}

interface BaselineRow {
  label: string
  today: string
  usual: string
  /** Fractions of the track, 0–1. */
  todayFill: number
  usualStart: number
  usualWidth: number
  delta: string
  flagged: boolean
}

function baselineRows(a: Athlete): BaselineRow[] {
  const rows: BaselineRow[] = []
  if (a.baseline) {
    const scale = (label: RecoveryMetric, value: number | null, usual: number): BaselineRow => {
      const d = value === null ? 0 : Math.round((value - usual) * 10) / 10
      return {
        label,
        today: value === null ? '—' : `${value}/5`,
        usual: `${formatScore(usual)}/5`,
        todayFill: value === null ? 0 : value / 5,
        usualStart: Math.max(0, (usual - 0.5) / 5),
        usualWidth: 1 / 5,
        delta:
          value === null
            ? 'No check-in yet'
            : d === 0
              ? 'Same as usual'
              : `${formatScore(Math.abs(d))} ${d > 0 ? 'above' : 'below'} usual`,
        flagged: value !== null && isDeviating(label, value, usual),
      }
    }
    rows.push(
      scale('Fatigue', a.fatigue, a.baseline.fatigue),
      scale('Wellness', a.wellness, a.baseline.wellness),
      scale('Soreness', a.soreness, a.baseline.soreness),
    )
  }
  if (a.load !== null && a.loadRange && a.loadChangePct !== null) {
    const max = Math.max(a.loadRange.high * 1.3, ...a.loadHistory.map((p) => p.load), a.load) * 1.05
    rows.push({
      label: 'Training load (last session)',
      today: `${a.load} AU`,
      usual: `${a.loadRange.low}–${a.loadRange.high}`,
      todayFill: a.load / max,
      usualStart: a.loadRange.low / max,
      usualWidth: (a.loadRange.high - a.loadRange.low) / max,
      delta: `${a.loadChangePct > 0 ? '+' : ''}${a.loadChangePct}% vs recent baseline`,
      flagged: isLoadElevated(a.loadChangePct),
    })
  }
  return rows
}

function PersonalBaseline({ athlete: a }: { athlete: Athlete }) {
  const rows = baselineRows(a)
  return (
    <section aria-labelledby="baseline-title" className={ui.card} style={{ gap: 16 }}>
      <div className={ui.titleBlock}>
        <h2 id="baseline-title" className={ui.cardTitle}>
          Personal baseline
        </h2>
        <span className={ui.caption}>Today vs {a.firstName}’s usual</span>
      </div>
      {rows.length === 0 && (
        <p className={styles.quiet}>The baseline builds over {a.firstName}’s first 7–14 days of check-ins.</p>
      )}
      {rows.map((row) => (
        <div key={row.label} className={styles.baselineRow}>
          <div className={styles.baselineHead}>
            <span className={styles.baselineLabel}>{row.label}</span>
            <span className={styles.delta} data-flagged={row.flagged}>
              {row.delta}
            </span>
          </div>
          <div className={styles.bars}>
            <span className={styles.barLabel}>Today</span>
            <div className={styles.track} aria-hidden="true">
              <div className={styles.today} data-flagged={row.flagged} style={{ width: `${row.todayFill * 100}%` }} />
            </div>
            <span className={styles.barValue}>{row.today}</span>
            <span className={styles.barLabel}>Usual</span>
            <div className={styles.track} aria-hidden="true">
              <div
                className={styles.usualBand}
                style={{ left: `${row.usualStart * 100}%`, width: `${row.usualWidth * 100}%` }}
              />
            </div>
            <span className={styles.barUsual}>{row.usual}</span>
          </div>
        </div>
      ))}
    </section>
  )
}

function Recovery({ athlete: a }: { athlete: Athlete }) {
  const declining = a.signals.some((s) => s.kind === 'Recovery signal')
  const tile = (label: RecoveryMetric, value: number | null, usual: number | undefined) => ({
    label,
    value: value === null ? '—' : `${value}/5`,
    usual: usual === undefined ? '—' : `${formatScore(usual)}/5`,
    flagged: value !== null && usual !== undefined && isDeviating(label, value, usual),
  })
  const tiles = [
    { label: 'Sleep', value: a.sleep ?? '—', usual: a.baseline?.sleep ?? '—', flagged: false },
    tile('Wellness', a.wellness, a.baseline?.wellness),
    tile('Fatigue', a.fatigue, a.baseline?.fatigue),
    tile('Soreness', a.soreness, a.baseline?.soreness),
  ]
  return (
    <section aria-labelledby="recovery-title" className={ui.card}>
      <h2 id="recovery-title" className={ui.cardTitle}>
        Recovery
      </h2>
      <div className={styles.recoveryGrid}>
        {tiles.map((t) => (
          <div key={t.label} className={cx(ui.tile, styles.recoveryTile)} data-flagged={t.flagged}>
            <span className={ui.tileLabel}>{t.label}</span>
            <span className={styles.recoveryValue}>{t.value}</span>
            <span className={styles.recoveryUsual}>usual {t.usual}</span>
          </div>
        ))}
      </div>
      {a.checkedInAt && a.baseline && (
        <p className={styles.trendLine} data-flagged={declining}>
          {declining ? 'Recovery has declined over the last 3 days.' : `Recovery is within ${a.firstName}’s usual range.`}
        </p>
      )}
    </section>
  )
}

function TrainingLoad({ athlete: a }: { athlete: Athlete }) {
  const change = a.loadChangePct
  const elevated = change !== null && isLoadElevated(change)
  return (
    <section aria-labelledby="load-title" className={ui.card}>
      <div className={styles.loadHead}>
        <div className={cx(ui.titleBlock, styles.loadTitle)}>
          <h2 id="load-title" className={ui.cardTitle}>
            Training load · last 14 days
          </h2>
          <span className={ui.caption}>Session duration × RPE, in arbitrary units (AU)</span>
        </div>
        {change !== null && (
          <span className={cx(ui.pill, styles.loadPill)} data-tone={elevated ? 'review' : 'normal'}>
            {elevated
              ? `Load increased ${change}% compared with recent baseline`
              : `Load within usual range (${change > 0 ? '+' : ''}${change}%)`}
          </span>
        )}
      </div>
      {a.loadHistory.length > 0 ? (
        <LoadBarChart points={a.loadHistory} range={a.loadRange} />
      ) : (
        <p className={styles.quiet}>No post-training check-ins in the last 14 days.</p>
      )}
      <p className={ui.caption}>
        Training load is estimated from session duration and perceived exertion.
        {a.lastSession && a.load !== null && ` Latest session: ${a.lastSession} = ${a.load} AU.`}
      </p>
    </section>
  )
}

function CoachActionForm({ athlete: a }: { athlete: Athlete }) {
  const { recordAction } = useCoachStore()
  const [choice, setChoice] = useState<CoachAction | null>(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <section aria-labelledby="action-title" className={ui.card}>
      <div className={ui.titleBlock}>
        <h2 id="action-title" className={ui.cardTitle}>
          Coach action
        </h2>
        <span className={ui.caption}>Record what happened. Saved to {a.firstName}’s history.</span>
      </div>
      <form
        className={styles.stack}
        style={{ gap: 14 }}
        onSubmit={async (e) => {
          e.preventDefault()
          if (!choice || saving) return
          setSaving(true)
          setError(null)
          try {
            await recordAction(a.id, choice, notes)
            setChoice(null)
            setNotes('')
          } catch (err) {
            setError(`Couldn’t save the action. ${describeError(err)}`)
          } finally {
            setSaving(false)
          }
        }}
      >
        <ActionChoice value={choice} onChange={setChoice} layout="grid" />
        <label className={ui.field}>
          Add notes
          <textarea
            className={ui.textarea}
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={`e.g. Spoke with ${a.firstName} before training; sat out contact drills.`}
          />
        </label>
        {error && (
          <p className={styles.formError} role="alert">
            {error}
          </p>
        )}
        <div>
          <Button type="submit" size="md" disabled={!choice || saving}>
            {saving ? 'Saving…' : 'Save action'}
          </Button>
        </div>
      </form>
    </section>
  )
}

function FollowUpHistory({ athlete: a }: { athlete: Athlete }) {
  const { audit } = useCoachStore()
  const history = audit.filter((e) => e.athleteId === a.id)
  return (
    <section aria-labelledby="history-title" className={ui.card} style={{ gap: 4 }}>
      <h2 id="history-title" className={ui.cardTitle} style={{ marginBottom: 10 }}>
        Follow-up history
      </h2>
      {history.length === 0 ? (
        <span className={styles.noHistory}>No recorded actions yet.</span>
      ) : (
        <AuditFeed entries={history} variant="timeline" />
      )}
    </section>
  )
}
