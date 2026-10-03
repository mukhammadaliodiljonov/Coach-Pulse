import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Avatar } from '../../components/ui/Avatar'
import { ChipGroup } from '../../components/ui/ChipGroup'
import { Input } from '../../components/ui/Input'
import { Segmented } from '../../components/ui/Segmented'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { formatScore, hasFatigueAboveUsual, isDeviating, isLoadElevated } from '../../domain/signals'
import type { Athlete } from '../../domain/types'
import { MOBILE_QUERY, useMediaQuery } from '../../lib/useMediaQuery'
import { useTitle } from '../../lib/useTitle'
import { paths, useProfileLinkState, type AthleteFilter } from '../../navigation/paths'
import { useCoachStore } from '../../state/coachStore'
import ui from '../../styles/ui.module.css'
import styles from './Athletes.module.css'

const FILTER_LABELS: Record<AthleteFilter, string> = {
  all: 'All',
  high: 'High priority',
  review: 'Needs review',
  normal: 'Normal',
  fatigue: 'Fatigue above usual',
  pending: 'Pending check-in',
}

const FILTERS = Object.keys(FILTER_LABELS) as AthleteFilter[]

function matches(a: Athlete, filter: AthleteFilter): boolean {
  switch (filter) {
    case 'all':
      return true
    case 'fatigue':
      return hasFatigueAboveUsual(a)
    case 'pending':
      return !a.checkedInAt
    default:
      return a.status === filter
  }
}

interface MetricCell {
  label: string
  value: string
  usual: string
  flagged: boolean
}

function metricCells(a: Athlete): MetricCell[] {
  // A dash while today's check-in is pending; "no baseline" during the first weeks.
  const scale = (label: 'Wellness' | 'Fatigue' | 'Soreness', value: number | null, usual: number | undefined): MetricCell => ({
    label,
    value: value === null ? '—' : `${value}/5`,
    usual: usual === undefined ? 'no baseline' : `usual ${formatScore(usual)}`,
    flagged: value !== null && usual !== undefined && isDeviating(label, value, usual),
  })
  const change = a.loadChangePct
  return [
    scale('Wellness', a.wellness, a.baseline?.wellness),
    scale('Fatigue', a.fatigue, a.baseline?.fatigue),
    scale('Soreness', a.soreness, a.baseline?.soreness),
    {
      label: 'Load',
      value: change === null ? '—' : `${change > 0 ? '+' : ''}${change}%`,
      usual: a.load === null ? 'no sessions' : `${a.load} AU`,
      flagged: change !== null && isLoadElevated(change),
    },
  ]
}

export function Athletes() {
  useTitle('Athletes')
  const { roster } = useCoachStore()
  const [params, setParams] = useSearchParams()
  const requested = params.get('filter')
  const filter = FILTERS.find((f) => f === requested) ?? 'all'
  const [query, setQuery] = useState('')
  const isMobile = useMediaQuery(MOBILE_QUERY)
  const [chosenView, setChosenView] = useState<'table' | 'cards' | null>(null)
  const view = chosenView ?? (isMobile ? 'cards' : 'table')

  const q = query.trim().toLowerCase()
  const rows = roster.filter((a) => matches(a, filter) && (!q || a.name.toLowerCase().includes(q)))

  return (
    <div className={ui.page}>
      <header className={ui.pageHeader}>
        <div className={ui.pageHeading}>
          <h1 className={ui.pageTitle}>Athletes</h1>
          <p className={ui.pageLead}>{roster.length} athletes · sorted by attention level</p>
        </div>
        <Segmented
          variant="toggle"
          label="View"
          value={view}
          onChange={setChosenView}
          options={[
            { value: 'table', label: 'Table' },
            { value: 'cards', label: 'Cards' },
          ]}
        />
      </header>

      <div className={styles.toolbar}>
        <div className={styles.search}>
          <Input
            variant="filled"
            leftIcon="search"
            placeholder="Search athletes"
            aria-label="Search athletes"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            shellClassName={styles.searchShell}
          />
        </div>
        <ChipGroup
          label="Filter by status"
          value={filter}
          onChange={(f) => setParams(f === 'all' ? {} : { filter: f }, { replace: true })}
          options={FILTERS.map((f) => ({
            value: f,
            label: FILTER_LABELS[f],
            count: roster.filter((a) => matches(a, f)).length,
          }))}
        />
      </div>

      {rows.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyTitle}>No athletes match</span>
          <span className={ui.emptyText}>Try a different name or clear the filter.</span>
        </div>
      ) : view === 'table' ? (
        <AthleteTable rows={rows} />
      ) : (
        <AthleteCards rows={rows} />
      )}
    </div>
  )
}

function AthleteTable({ rows }: { rows: Athlete[] }) {
  const navigate = useNavigate()
  const linkState = useProfileLinkState()
  const open = (a: Athlete) => navigate(paths.athlete(a.id), { state: linkState })
  return (
    <div className={styles.tableCard}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Athlete</th>
            <th scope="col">Status</th>
            <th scope="col">Wellness</th>
            <th scope="col">Fatigue</th>
            <th scope="col">Soreness</th>
            <th scope="col">Training load</th>
            <th scope="col">Last check-in</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr
              key={a.id}
              className={styles.row}
              data-status={a.status}
              tabIndex={0}
              aria-label={`${a.name}, ${a.reason}. Open profile`}
              onClick={() => open(a)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') open(a)
              }}
            >
              <td>
                <div className={styles.athlete}>
                  <Avatar initials={a.initials} size={36} status={a.status} />
                  <div className={styles.athleteText}>
                    <span className={styles.name}>{a.name}</span>
                    <span className={styles.position}>{a.position ?? 'Athlete'}</span>
                  </div>
                </div>
              </td>
              <td>
                <div className={styles.statusCell}>
                  <StatusBadge status={a.status} size="sm" />
                  <span className={styles.reason}>{a.reason}</span>
                </div>
              </td>
              {metricCells(a).map((c) => (
                <td key={c.label}>
                  <span className={styles.metric} data-flagged={c.flagged}>
                    {c.value}
                  </span>
                  <span className={styles.usual}>{c.usual}</span>
                </td>
              ))}
              <td className={styles.checkIn} data-pending={!a.checkedInAt}>
                {a.checkedInAt ?? 'Pending'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AthleteCards({ rows }: { rows: Athlete[] }) {
  const linkState = useProfileLinkState()
  return (
    <div className={styles.cards}>
      {rows.map((a) => (
        <Link key={a.id} to={paths.athlete(a.id)} state={linkState} className={styles.card}>
          <div className={styles.cardHead}>
            <Avatar initials={a.initials} size={40} status={a.status} />
            <div className={styles.athleteText}>
              <span className={styles.cardName}>{a.name}</span>
              <span className={styles.position}>
                {a.position ?? 'Athlete'} · {a.checkedInAt ?? 'Pending'}
              </span>
            </div>
          </div>
          <div className={styles.cardStatus}>
            <StatusBadge status={a.status} size="sm" />
            <span className={styles.cardReason}>{a.reason}</span>
          </div>
          <div className={styles.cardMetrics}>
            {metricCells(a).map((c) => (
              <div key={c.label} className={styles.cardMetric} data-flagged={c.flagged}>
                <span className={styles.cardMetricLabel}>{c.label}</span>
                <span className={styles.cardMetricValue}>{c.value}</span>
              </div>
            ))}
          </div>
        </Link>
      ))}
    </div>
  )
}
