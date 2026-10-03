import { useState } from 'react'
import { cx } from '../../lib/cx'
import { formatClock } from '../../lib/time'
import { useCoachStore } from '../../state/coachStore'
import ui from '../../styles/ui.module.css'
import { paths } from '../../navigation/paths'
import { Button, ButtonLink } from '../ui/Button'
import styles from './LoadStates.module.css'

/** Placeholder blocks while the team's data loads. */
export function PageSkeleton() {
  return (
    <div className={styles.skeleton} aria-busy="true" aria-label="Loading">
      <div className={styles.row}>
        <div className={styles.block} style={{ height: 132 }} />
        <div className={styles.block} style={{ height: 132 }} />
        <div className={styles.block} style={{ height: 132 }} />
      </div>
      <div className={styles.block} style={{ height: 22, width: 220, borderRadius: 8 }} />
      <div className={styles.block} style={{ height: 180 }} />
      <div className={cx(styles.row, styles.pair)}>
        <div className={styles.block} style={{ height: 200 }} />
        <div className={styles.block} style={{ height: 200 }} />
      </div>
    </div>
  )
}

/** A new coach: signed in, but there's no team to show yet. */
export function NoTeam() {
  return (
    <div className={cx(ui.empty, styles.error)}>
      <span className={ui.emptyTitle}>Create your team to get started</span>
      <span className={cx(ui.emptyText, styles.errorDetail)}>
        Your dashboard shows your athletes’ check-ins once you’ve set up a team.
      </span>
      <ButtonLink size="md" to={paths.setup}>
        Create team
      </ButtonLink>
    </div>
  )
}

/** The first load failed. */
export function LoadError() {
  const { loadError, reload } = useCoachStore()
  const [retrying, setRetrying] = useState(false)
  return (
    <div className={cx(ui.empty, styles.error)} role="alert">
      <span className={ui.emptyTitle}>Something went wrong. Try again.</span>
      {loadError && <span className={cx(ui.emptyText, styles.errorDetail)}>{loadError}</span>}
      <Button
        size="md"
        disabled={retrying}
        onClick={async () => {
          setRetrying(true)
          await reload()
          setRetrying(false)
        }}
      >
        {retrying ? 'Trying…' : 'Try again'}
      </Button>
    </div>
  )
}

/** The connection dropped after loading; the last data stays on screen. */
export function OfflineBanner() {
  const { lastUpdated, reload, showToast } = useCoachStore()
  const [retrying, setRetrying] = useState(false)
  return (
    <div role="alert" className={styles.offline}>
      <span className={styles.offlineText}>
        You’re offline. Showing data last updated{lastUpdated ? ` at ${formatClock(lastUpdated)}` : ''} — new check-ins
        will appear when you reconnect.
      </span>
      <button
        type="button"
        className={styles.retry}
        disabled={retrying}
        onClick={async () => {
          setRetrying(true)
          if (await reload()) showToast('Reconnected — data is up to date')
          setRetrying(false)
        }}
      >
        {retrying ? 'Retrying…' : 'Retry'}
      </button>
    </div>
  )
}
