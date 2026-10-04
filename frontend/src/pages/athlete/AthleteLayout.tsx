import { useEffect, type ReactNode } from 'react'
import { Navigate, NavLink, Outlet } from 'react-router'
import { useAuth } from '../../auth/useAuth'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { cx } from '../../lib/cx'
import { paths } from '../../navigation/paths'
import { useAthleteStore } from '../../state/athleteStore'
import styles from './athlete.module.css'
import { AthleteSidebar } from './AthleteSidebar'
import { ATHLETE_TABS } from './athleteTabs'

/** The athlete app as a web page; signed-in screens add the sidebar or bottom nav (AthleteTabs). */
export function AthleteLayout() {
  return (
    <div className={styles.page}>
      <Outlet />
    </div>
  )
}

/** Shown while the athlete's data loads. */
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

/**
 * Renders `children` once the athlete's data has loaded. With the backend, the route guard has already
 * checked the session, so load the data here (e.g. after a reload). With sample data, send the
 * athlete to the demo sign-in.
 */
function AthleteReady({ children }: { children: ReactNode }) {
  const { signedIn, loading, error, signIn } = useAthleteStore()
  const auth = useAuth()
  const shouldLoad = auth.required && !signedIn && !loading && !error

  useEffect(() => {
    // Loading is the external system this effect syncs with.
    // oxlint-disable-next-line react/set-state-in-effect
    if (shouldLoad) void signIn()
  }, [shouldLoad, signIn])

  if (signedIn) return children
  if (!auth.required && !loading) return <Navigate to={paths.athleteApp.login} replace />
  if (error) {
    return (
      <div className={styles.scroll}>
        <div className={styles.auth}>
          <p className={styles.error} role="alert">
            {error}
          </p>
          <Button fullWidth onClick={() => void signIn()}>
            Try again
          </Button>
          <Button variant="outline" fullWidth onClick={auth.signOut}>
            Log out
          </Button>
        </div>
      </div>
    )
  }
  return <Signing />
}

/** Signed-in screens: the sidebar on wider screens, the floating bottom nav on phones. */
export function AthleteTabs() {
  return (
    <AthleteReady>
      <div className={styles.shell}>
        <AthleteSidebar />
        <main className={styles.main}>
          <div className={styles.scroll}>
            <Outlet />
          </div>
          <nav className={styles.nav} aria-label="Athlete navigation">
            {ATHLETE_TABS.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) => cx(styles.navItem, isActive && styles.active)}
              >
                <span className={styles.navIcon}>
                  <Icon name={tab.icon} size={19} />
                </span>
                {tab.label}
              </NavLink>
            ))}
          </nav>
        </main>
      </div>
    </AthleteReady>
  )
}

/** Check-in flows hide the navigation but still need a signed-in athlete. */
export function RequireAthlete() {
  return (
    <AthleteReady>
      <div className={styles.flow}>
        <Outlet />
      </div>
    </AthleteReady>
  )
}
