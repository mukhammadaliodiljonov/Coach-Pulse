import { useSearchParams } from 'react-router'
import { ButtonLink } from '../../components/ui/Button'
import { ChipGroup } from '../../components/ui/ChipGroup'
import { Icon } from '../../components/ui/Icon'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { alertTimeLabel } from '../../domain/alerts'
import { STATUS_LABELS, type Status } from '../../domain/types'
import { cx } from '../../lib/cx'
import { useTitle } from '../../lib/useTitle'
import { paths, useProfileLinkState, type AlertFilter } from '../../navigation/paths'
import { useCoachStore } from '../../state/coachStore'
import ui from '../../styles/ui.module.css'
import styles from './Alerts.module.css'

interface AlertItem {
  key: string
  athleteId: string
  name: string
  status: Exclude<Status, 'normal'>
  reason: string
  detected: string
  resolved: boolean
  state: string
  /** Today's open alerts link to the alert; past ones to the athlete. */
  to: string
}

const FILTERS: { value: AlertFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'high', label: 'High priority' },
  { value: 'review', label: 'Needs review' },
  { value: 'resolved', label: 'Resolved' },
]

const matches = (item: AlertItem, filter: AlertFilter) =>
  filter === 'all' || (filter === 'resolved' ? item.resolved : !item.resolved && item.status === filter)

export function Alerts() {
  useTitle('Alerts')
  const { team, actions, pastAlerts } = useCoachStore()
  const linkState = useProfileLinkState()
  const [params, setParams] = useSearchParams()
  const filter = FILTERS.find((f) => f.value === params.get('filter'))?.value ?? 'all'

  const items: AlertItem[] = [
    ...team.flagged.map((a) => {
      const action = actions[a.id]
      return {
        key: `today-${a.id}`,
        athleteId: a.id,
        name: a.name,
        status: a.status as AlertItem['status'],
        reason: a.reason,
        detected: alertTimeLabel(a),
        resolved: Boolean(action),
        state: action ? 'Action recorded' : 'Needs review',
        to: paths.alert(a.id),
      }
    }),
    ...pastAlerts.map((r) => ({
      key: `past-${r.athleteId}`,
      athleteId: r.athleteId,
      name: r.name,
      status: r.status,
      reason: r.reason,
      detected: r.detected,
      resolved: true,
      state: `Resolved · ${r.action}`,
      to: paths.athlete(r.athleteId),
    })),
  ]
  const visible = items.filter((item) => matches(item, filter))

  return (
    <div className={ui.page}>
      <header className={ui.pageHeading}>
        <h1 className={ui.pageTitle}>Alerts</h1>
        <p className={ui.pageLead}>Highest priority first. Each alert shows why it was raised.</p>
      </header>
      <ChipGroup
        label="Alert filter"
        semantics="tabs"
        size="md"
        value={filter}
        onChange={(f) => setParams(f === 'all' ? {} : { filter: f }, { replace: true })}
        options={FILTERS.map((f) => ({ ...f, count: items.filter((item) => matches(item, f.value)).length }))}
      />
      {visible.length === 0 ? (
        <div className={ui.empty}>
          <span className={ui.emptyIcon}>
            <Icon name="done" size={24} />
          </span>
          <span className={ui.emptyTitle}>No alerts today.</span>
          <span className={ui.emptyText}>New alerts will appear here as athletes check in.</span>
        </div>
      ) : (
        <ul className={styles.list}>
          {visible.map((item) => (
            <li key={item.key} className={styles.alert} data-resolved={item.resolved}>
              <StatusBadge status={item.status} iconOnly iconSize={26} />
              <div className={styles.body}>
                <div className={styles.titleRow}>
                  <span className={styles.name}>{item.name}</span>
                  <span className={styles.priority} data-status={item.status}>
                    {STATUS_LABELS[item.status]}
                  </span>
                </div>
                <span className={styles.reason}>{item.reason}</span>
                <span className={styles.detected}>Detected {item.detected}</span>
              </div>
              <span className={cx(ui.pill, styles.state)} data-tone={item.resolved ? 'normal' : undefined}>
                {item.state}
              </span>
              <ButtonLink
                size="sm"
                variant={item.status === 'high' && !item.resolved ? 'primary' : 'outline'}
                to={item.to}
                state={linkState}
                aria-label={`View alert for ${item.name}`}
              >
                View alert
              </ButtonLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
