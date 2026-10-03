import { useState } from 'react'
import { Link } from 'react-router'
import { TrendLineChart } from '../../components/charts/TrendLineChart'
import { Avatar } from '../../components/ui/Avatar'
import { AuditFeed } from '../../components/ui/AuditFeed'
import { Button, ButtonLink } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { Segmented } from '../../components/ui/Segmented'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { DEMO_DAY, TEAM_BASELINE } from '../../data/team'
import { latestLoadChange, weekTrend, type WeekMetric } from '../../data/trends'
import type { TeamSummary } from '../../domain/team'
import { STATUS_LABELS, type Athlete, type Status } from '../../domain/types'
import { cx } from '../../lib/cx'
import { useTitle } from '../../lib/useTitle'
import { paths, useProfileLinkState } from '../../navigation/paths'
import { useCoachStore } from '../../state/coachStore'
import ui from '../../styles/ui.module.css'
import styles from './Overview.module.css'

export function Overview() {
  useTitle('Overview')
  const { scenario, team, audit, showToast } = useCoachStore()

  return (
    <div className={cx(ui.page, styles.page)}>
      <header className={styles.header}>
        <h1 className={styles.greeting}>Good morning, Coach</h1>
        <p className={styles.date}>
          {DEMO_DAY} · {team.checkedIn} of {team.size} athletes checked in
        </p>
      </header>

      {scenario === 'offline' && (
        <div role="alert" className={styles.offline}>
          <span className={styles.offlineText}>
            You’re offline. Showing data last updated at 7:58 AM — new check-ins will appear when you reconnect.
          </span>
          <button type="button" className={styles.retry} onClick={() => showToast('Reconnected — data is up to date')}>
            Retry
          </button>
        </div>
      )}

      {scenario === 'loading' ? (
        <DashboardSkeleton />
      ) : scenario === 'noCheckins' ? (
        <div className={styles.waiting}>
          <span className={styles.waitingIcon}>
            <Icon name="calendar" size={28} />
          </span>
          <h2 className={styles.waitingTitle}>Waiting for today’s athlete check-ins</h2>
          <p className={styles.waitingText}>
            Check-ins usually arrive between 7:00 and 9:00 AM. You’ll see who needs attention as soon as they come in.
          </p>
          <Button variant="outline" size="md" onClick={() => showToast('Reminder sent to the team')}>
            Send reminder to team
          </Button>
        </div>
      ) : (
        <>
          <TeamStatus team={team} />
          <AttentionRequired team={team} />
          <div className={styles.duo}>
            {team.showPattern && <TeamPattern team={team} />}
            <TeamSnapshot team={team} loadChange={latestLoadChange(scenario)} />
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
            {a.position} · Checked in {a.checkedInAt ?? '—'}
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
          <span className={styles.reviewPosition}>{a.position}</span>
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

function TeamSnapshot({ team, loadChange }: { team: TeamSummary; loadChange: number }) {
  const { wellness, fatigue, soreness } = team.averages
  const fatigueUp = fatigue - TEAM_BASELINE.fatigue >= 0.3
  const pending = team.size - team.checkedIn
  const tiles: {
    label: string
    value: string
    unit: string
    fill: number
    tone?: 'review'
    sub: string
    subTone?: 'review' | 'high'
  }[] = [
    {
      label: 'Check-ins',
      value: String(Math.round((team.checkedIn / team.size) * 100)),
      unit: '%',
      fill: team.checkedIn / team.size,
      sub: `${team.checkedIn} of ${team.size} · ${pending} pending`,
    },
    {
      label: 'Average wellness',
      value: wellness.toFixed(1),
      unit: ' / 5',
      fill: wellness / 5,
      sub: `Usual ${TEAM_BASELINE.wellness}`,
    },
    {
      label: 'Average fatigue',
      value: fatigue.toFixed(1),
      unit: ' / 5',
      fill: fatigue / 5,
      tone: fatigueUp ? 'review' : undefined,
      sub: `${fatigueUp ? 'Above usual' : 'Usual'} ${TEAM_BASELINE.fatigue}`,
      subTone: fatigueUp ? 'review' : undefined,
    },
    {
      label: 'Average soreness',
      value: soreness.toFixed(1),
      unit: ' / 5',
      fill: soreness / 5,
      sub: `Usual ${TEAM_BASELINE.soreness.toFixed(1)}`,
    },
    {
      label: 'Training load',
      value: `${loadChange > 0 ? '+' : ''}${loadChange}`,
      unit: '%',
      fill: (TEAM_BASELINE.load * (1 + loadChange / 100)) / 1000,
      tone: loadChange >= 10 ? 'review' : undefined,
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
    </section>
  )
}

function DashboardSkeleton() {
  return (
    <div className={styles.skeleton} aria-busy="true" aria-label="Loading dashboard">
      <div className={styles.skeletonRow}>
        <div style={{ height: 132 }} />
        <div style={{ height: 132 }} />
        <div style={{ height: 132 }} />
      </div>
      <div style={{ height: 22, width: 220, borderRadius: 8 }} />
      <div style={{ height: 180 }} />
      <div className={styles.skeletonRow} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        <div style={{ height: 200 }} />
        <div style={{ height: 200 }} />
      </div>
    </div>
  )
}
