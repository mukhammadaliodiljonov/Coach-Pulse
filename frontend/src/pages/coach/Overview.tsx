import { useState } from 'react'
import { Link } from 'react-router'
import { TrendLineChart } from '../../components/charts/TrendLineChart'
import { Avatar } from '../../components/ui/Avatar'
import { AuditFeed } from '../../components/ui/AuditFeed'
import { Button, ButtonLink } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { SampleDataNote } from '../../components/ui/SampleDataNote'
import { Segmented } from '../../components/ui/Segmented'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { DEMO_DAY, TEAM_BASELINE } from '../../data/team'
import { weekTrend, type WeekMetric } from '../../data/trends'
import type { TeamSummary } from '../../domain/team'
import { STATUS_LABELS, type Athlete, type Status } from '../../domain/types'
import { cx } from '../../lib/cx'
import { useTitle } from '../../lib/useTitle'
import { paths, useProfileLinkState } from '../../navigation/paths'
import { useCoachStore } from '../../state/coachStore'
import ui from '../../styles/ui.module.css'
import styles from './Overview.module.css'

function greeting(now: Date): string {
  const hour = now.getHours()
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
}

export function Overview() {
  useTitle('Overview')
  const { dataSource, team, audit, teamLoadChangePct } = useCoachStore()
  // Sample data is pinned to its demo morning; real data uses the actual day.
  const [now] = useState(() => new Date())
  const day =
    dataSource === 'api' ? now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : DEMO_DAY

  return (
    <div className={cx(ui.page, styles.page)}>
      <header className={styles.header}>
        <h1 className={styles.greeting}>{dataSource === 'api' ? greeting(now) : 'Good morning'}, Coach</h1>
        <p className={styles.date}>
          {day} · {team.checkedIn} of {team.size} athletes checked in
        </p>
      </header>

      {team.checkedIn === 0 ? (
        <>
          <WaitingForCheckIns />
          {/* Flags from yesterday's training still need attention before today's check-ins arrive. */}
          {team.flagged.length > 0 && <AttentionRequired team={team} />}
        </>
      ) : (
        <>
          <TeamStatus team={team} />
          <AttentionRequired team={team} />
          <div className={styles.duo}>
            {team.showPattern && <TeamPattern team={team} />}
            <TeamSnapshot team={team} loadChange={teamLoadChangePct} />
          </div>
          <TeamTrend team={team} />
          <section aria-labelledby="activity-title" className={ui.card} style={{ gap: 6 }}>
            <h2 id="activity-title" className={ui.sectionTitle} style={{ marginBottom: 8 }}>
              Recent activity
            </h2>
            <AuditFeed entries={audit.slice(0, 5)} />
          </section>
        </>
      )}
    </div>
  )
}

function WaitingForCheckIns() {
  const { dataSource, showToast } = useCoachStore()
  return (
    <div className={styles.waiting}>
      <span className={styles.waitingIcon}>
        <Icon name="calendar" size={28} />
      </span>
      <h2 className={styles.waitingTitle}>Waiting for today’s athlete check-ins</h2>
      <p className={styles.waitingText}>
        Check-ins usually arrive between 7:00 and 9:00 AM. You’ll see who needs attention as soon as they come in.
      </p>
      {/* Sending reminders needs a backend endpoint; the sample data only pretends. */}
      {dataSource === 'mock' && (
        <Button variant="outline" size="md" onClick={() => showToast('Reminder sent to the team')}>
          Send reminder to team
        </Button>
      )}
    </div>
  )
}

/** 1. Is my team okay? */
function TeamStatus({ team }: { team: TeamSummary }) {
  const tiles: { status: Status; count: number; caption: string }[] = [
    { status: 'normal', count: team.normal.length, caption: 'No notable deviation detected' },
    { status: 'review', count: team.review.length, caption: 'Something changed from their usual range' },
    { status: 'high', count: team.high.length, caption: 'Safety symptom reported — review before training' },
  ]
  return (
    <section aria-labelledby="status-title" className={styles.section}>
      <h2 id="status-title" className={ui.sectionTitle}>
        Team status today
      </h2>
      <div className={styles.statusGrid}>
        {tiles.map((t) => (
          <Link
            key={t.status}
            to={paths.athletes(t.status)}
            className={styles.statusTile}
            data-status={t.status}
            data-tinted={t.count > 0}
          >
            <StatusBadge status={t.status} size="sm" />
            <span className={styles.statusFigure}>
              <span className={styles.statusNumber}>{t.count}</span>
              <span className={styles.statusUnit}>{STATUS_LABELS[t.status]}</span>
            </span>
            <span className={styles.statusCaption}>{t.caption}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}

/** 2. Who needs attention, and why? */
function AttentionRequired({ team }: { team: TeamSummary }) {
  return (
    <section aria-labelledby="attention-title" className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 id="attention-title" className={ui.sectionTitle}>
          Attention required
        </h2>
        <span className={styles.sectionCount}>
          {team.flagged.length
            ? `${team.flagged.length} athletes · ${team.high.length} high priority`
            : 'Nobody right now'}
        </span>
        <span className={styles.push} />
        <Link to={paths.alerts}>View all alerts</Link>
      </div>
      {team.flagged.length === 0 && (
        <div className={styles.allGreen}>
          <span className={styles.allGreenIcon}>
            <Icon name="done" size={24} />
          </span>
          <div className={styles.allGreenText}>
            <span className={styles.allGreenTitle}>Your team looks good today.</span>
            <span className={styles.allGreenSub}>
              No notable changes from anyone’s usual range. Nothing needs review right now.
            </span>
          </div>
        </div>
      )}
      {team.high.map((a) => (
        <HighPriorityCard key={a.id} athlete={a} />
      ))}
      {team.review.length > 0 && (
        <div className={styles.reviewGrid}>
          {team.review.map((a) => (
            <ReviewCard key={a.id} athlete={a} />
          ))}
        </div>
      )}
    </section>
  )
}

function HighPriorityCard({ athlete: a }: { athlete: Athlete }) {
  const { actions, openRecordAction } = useCoachStore()
  const linkState = useProfileLinkState()
  const action = actions[a.id]
  return (
    <article className={styles.highCard} aria-label={`${a.name}, high priority`}>
      <div className={styles.highHeader}>
        <Avatar initials={a.initials} size={48} status="high" tone="onTint" />
        <div className={styles.who}>
          <span className={styles.highName}>{a.name}</span>
          <span className={styles.whoMeta}>
            {a.position ?? 'Athlete'} · Checked in {a.checkedInAt ?? '—'}
          </span>
        </div>
        <StatusBadge status="high" size="md" />
      </div>
      <div className={styles.highBody}>
        <div className={styles.column}>
          <span className={styles.label}>Why</span>
          <span className={styles.highReason}>{a.reason}</span>
          {a.signals.length > 1 && (
            <div className={styles.chips}>
              {a.signals.slice(1).map((s) => (
                <span key={s.kind} className={styles.chip}>
                  <StatusBadge status={s.level} iconOnly iconSize={14} />
                  {s.chip}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className={styles.column}>
          <span className={styles.label}>Suggested next step</span>
          <span className={styles.nextStep}>{a.nextStepShort}</span>
          {action && <span className={ui.actionRecorded}>Action recorded · {action}</span>}
          <div className={styles.buttons}>
            <ButtonLink size="sm" to={paths.athlete(a.id)} state={linkState}>
              View athlete
            </ButtonLink>
            <Button size="sm" variant="outline" onClick={() => openRecordAction(a.id)}>
              Record action
            </Button>
          </div>
        </div>
      </div>
    </article>
  )
}

function ReviewCard({ athlete: a }: { athlete: Athlete }) {
  const { actions } = useCoachStore()
  const linkState = useProfileLinkState()
  const action = actions[a.id]
  const compare = a.signals[0]?.compare[0]
  return (
    <article className={styles.reviewCard} aria-label={`${a.name}, needs review`}>
      <div className={styles.reviewHead}>
        <Avatar initials={a.initials} size={40} status="review" />
        <div className={styles.reviewWho}>
          <span className={styles.reviewName}>{a.name}</span>
          <span className={styles.reviewPosition}>{a.position ?? 'Athlete'}</span>
        </div>
        <StatusBadge status="review" size="sm" />
      </div>
      <span className={styles.reviewReason}>{a.reason}</span>
      {compare && (
        <div className={styles.compare}>
          <div className={styles.compareTile} data-current="true">
            <div className={styles.compareLabel}>Current</div>
            <div className={styles.compareValue}>{compare.current}</div>
          </div>
          <div className={styles.compareTile}>
            <div className={styles.compareLabel}>Typical</div>
            <div className={styles.compareValue}>{compare.baseline}</div>
          </div>
        </div>
      )}
      <span className={styles.reviewNext}>{a.nextStepShort}</span>
      {action && <span className={ui.actionRecorded}>Action recorded · {action}</span>}
      <div className={styles.grow} />
      <ButtonLink size="sm" variant="outline" fullWidth to={paths.athlete(a.id)} state={linkState}>
        View athlete
      </ButtonLink>
    </article>
  )
}

/** Shown only when enough athletes shift together that the cause is probably shared. */
function TeamPattern({ team }: { team: TeamSummary }) {
  const affected = team.fatigueAboveUsual.length
  return (
    <section aria-labelledby="pattern-title" className={ui.card} style={{ gap: 16 }}>
      <div className={styles.sectionHead} style={{ alignItems: 'center', gap: 8 }}>
        <span className={styles.patternTag}>
          <Icon name="user" size={12} />
          Team-level pattern
        </span>
        <span className={ui.caption} style={{ fontSize: 12 }}>
          Not an individual alert
        </span>
      </div>
      <h2 id="pattern-title" className={styles.patternTitle}>
        Fatigue is elevated across the team today.
      </h2>
      <div className={styles.patternFigure}>
        <div className={styles.patternCount}>
          <span className={styles.patternNumber}>
            {affected} <span className={styles.patternOf}>of {team.size}</span>
          </span>
          <span className={styles.patternCaption}>athletes reported fatigue above their usual level</span>
        </div>
        <div className={styles.dots} aria-hidden="true">
          {Array.from({ length: team.size }, (_, i) => (
            <span key={i} data-on={i < affected} />
          ))}
        </div>
      </div>
      <p className={styles.body}>
        When many athletes shift at once, the cause is often shared — a hard session, travel, or exams. Consider the
        overall session plan, not just individuals.
      </p>
      <div>
        <ButtonLink size="sm" variant="outline" to={paths.athletes('fatigue')}>
          View affected athletes
        </ButtonLink>
      </div>
    </section>
  )
}

type SnapshotTile = {
  label: string
  value: string
  unit: string
  fill: number
  tone?: 'review'
  sub: string
  subTone?: 'review' | 'high'
}

/** A team average out of 5, or a dash before anyone checks in. */
function averageTile(label: string, value: number | null, usual: number, worseUp?: boolean): SnapshotTile {
  const worse = value !== null && worseUp && value - usual >= 0.3
  return {
    label,
    value: value === null ? '—' : value.toFixed(1),
    unit: value === null ? '' : ' / 5',
    fill: value === null ? 0 : value / 5,
    tone: worse ? 'review' : undefined,
    sub: `${worse ? 'Above usual' : 'Usual'} ${usual.toFixed(1)}`,
    subTone: worse ? 'review' : undefined,
  }
}

function TeamSnapshot({ team, loadChange }: { team: TeamSummary; loadChange: number | null }) {
  const { wellness, fatigue, soreness } = team.averages
  const pending = team.size - team.checkedIn
  const tiles: SnapshotTile[] = [
    {
      label: 'Check-ins',
      value: String(team.size ? Math.round((team.checkedIn / team.size) * 100) : 0),
      unit: '%',
      fill: team.size ? team.checkedIn / team.size : 0,
      sub: `${team.checkedIn} of ${team.size} · ${pending} pending`,
    },
    averageTile('Average wellness', wellness, TEAM_BASELINE.wellness),
    averageTile('Average fatigue', fatigue, TEAM_BASELINE.fatigue, true),
    averageTile('Average soreness', soreness, TEAM_BASELINE.soreness),
    {
      label: 'Training load',
      value: loadChange === null ? '—' : `${loadChange > 0 ? '+' : ''}${loadChange}`,
      unit: loadChange === null ? '' : '%',
      fill: loadChange === null ? 0 : (TEAM_BASELINE.load * (1 + loadChange / 100)) / 1000,
      tone: loadChange !== null && loadChange >= 10 ? 'review' : undefined,
      sub: 'vs recent baseline',
    },
    {
      label: 'Requiring review',
      value: String(team.flagged.length),
      unit: ' athletes',
      fill: team.flagged.length / team.size,
      sub: `${team.high.length} high priority`,
      subTone: team.high.length ? 'high' : undefined,
    },
  ]
  return (
    <section aria-labelledby="snapshot-title" className={ui.card}>
      <h2 id="snapshot-title" className={ui.sectionTitle}>
        Team snapshot
      </h2>
      <div className={styles.snapshotGrid}>
        {tiles.map((t) => (
          <div key={t.label} className={cx(ui.tile, styles.snapshotTile)}>
            <span className={ui.tileLabel}>{t.label}</span>
            <span className={styles.snapshotValue}>
              {t.value}
              <span className={styles.unit}>{t.unit}</span>
            </span>
            <div className={styles.meter} aria-hidden="true">
              <span data-tone={t.tone} style={{ width: `${Math.min(1, t.fill) * 100}%` }} />
            </div>
            <span className={styles.snapshotSub} data-tone={t.subTone}>
              {t.sub}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

const TREND_TABS: { value: WeekMetric; label: string }[] = [
  { value: 'wellness', label: 'Wellness' },
  { value: 'fatigue', label: 'Fatigue' },
  { value: 'load', label: 'Training load' },
]

function TeamTrend({ team }: { team: TeamSummary }) {
  const [metric, setMetric] = useState<WeekMetric>('fatigue')
  const trend = weekTrend(metric, team.averages)
  return (
    <section aria-labelledby="trend-title" className={ui.card} style={{ gap: 16 }}>
      <div className={styles.trendHead}>
        <div className={cx(ui.titleBlock, styles.trendTitle)}>
          <h2 id="trend-title" className={ui.sectionTitle}>
            Team trend
          </h2>
          <span className={ui.caption}>Last 7 days · team average</span>
        </div>
        <Segmented options={TREND_TABS} value={metric} onChange={setMetric} label="Metric" />
      </div>
      <p className={styles.insight}>{trend.insight}</p>
      <TrendLineChart
        title={`Team ${trend.label.toLowerCase()}`}
        points={trend.points.map((p) => ({ ...p, display: p.value.toFixed(trend.decimals) }))}
        min={trend.min}
        max={trend.max}
        ticks={trend.ticks}
        baseline={trend.baseline}
        baselineLabel={String(trend.baseline)}
      />
      <p className={ui.caption}>Values are compared with the team’s recent baseline (dashed line, previous 21 days).</p>
      <SampleDataNote>Earlier days are sample data until the team trends API exists; today comes from check-ins.</SampleDataNote>
    </section>
  )
}
