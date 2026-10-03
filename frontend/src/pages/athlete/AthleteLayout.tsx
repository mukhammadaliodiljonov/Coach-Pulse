import { Link, Navigate, NavLink, Outlet } from 'react-router'
import { Icon } from '../../components/ui/Icon'
import type { IconName } from '../../components/ui/iconPaths'
import { cx } from '../../lib/cx'
import { paths } from '../../navigation/paths'
import { useAthleteStore } from '../../state/athleteStore'
import styles from './athlete.module.css'

/** The athlete app inside a phone frame on wide screens; full screen on phones. */
export function AthleteLayout() {
  return (
    <div className={styles.page}>
      <div className={styles.frameBar}>
        <span>Athlete app · mobile</span>
        <Link to={paths.overview}>Back to coach view</Link>
      </div>
      <div className={styles.phone}>
        <Outlet />
      </div>
    </div>
  )
}

const TABS: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: paths.athleteApp.home, label: 'Home', icon: 'home', end: true },
  { to: paths.athleteApp.history, label: 'History', icon: 'stats' },
  { to: paths.athleteApp.schedule, label: 'Schedule', icon: 'calendar' },
  { to: paths.athleteApp.profile, label: 'Profile', icon: 'user' },
]

/** Shown inside the phone while signing in. */
function Signing() {
  return (
    <div className={styles.scroll}>
      <div className={styles.signing} aria-busy="true" aria-label="Loading">
        <div className={styles.signingBlock} style={{ height: 32, width: 140 }} />
        <div className={styles.signingBlock} style={{ height: 30, width: '70%' }} />
        <div className={styles.signingBlock} style={{ height: 96 }} />
        <div className={styles.signingBlock} style={{ height: 96 }} />
      </div>
    </div>
  )
}

/** Signed-in screens with the floating bottom nav. */
export function AthleteTabs() {
  const { signedIn, loading } = useAthleteStore()
  if (!signedIn) return loading ? <Signing /> : <Navigate to={paths.athleteApp.login} replace />
  return (
    <>
      <div className={styles.scroll}>
        <Outlet />
      </div>
      <nav className={styles.nav} aria-label="Athlete navigation">
        {TABS.map((tab) => (
          <NavLink key={tab.to} to={tab.to} end={tab.end} className={({ isActive }) => cx(styles.navItem, isActive && styles.active)}>
            <span className={styles.navIcon}>
              <Icon name={tab.icon} size={19} />
            </span>
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </>
  )
}

/** Check-in flows hide the nav but still need a signed-in athlete. */
export function RequireAthlete() {
  const { signedIn, loading } = useAthleteStore()
  if (signedIn) return <Outlet />
  return loading ? <Signing /> : <Navigate to={paths.athleteApp.login} replace />
}
