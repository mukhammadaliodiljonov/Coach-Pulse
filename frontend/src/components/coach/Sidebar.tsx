import { NavLink, useNavigate } from 'react-router'
import { TEAM } from '../../data/team'
import { cx } from '../../lib/cx'
import { paths } from '../../navigation/paths'
import { useAthleteStore } from '../../state/athleteStore'
import { useCoachStore } from '../../state/coachStore'
import { Avatar } from '../ui/Avatar'
import { Icon } from '../ui/Icon'
import type { IconName } from '../ui/iconPaths'
import { Logo } from '../ui/Logo'
import ui from '../../styles/ui.module.css'
import styles from './Sidebar.module.css'

const NAV: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: paths.overview, label: 'Overview', icon: 'home', end: true },
  { to: paths.athletes(), label: 'Athletes', icon: 'user' },
  { to: paths.alerts, label: 'Alerts', icon: 'bell' },
  { to: paths.training, label: 'Training', icon: 'calendar' },
  { to: paths.trends, label: 'Team Trends', icon: 'stats' },
  { to: paths.reports, label: 'Reports', icon: 'book_open' },
  { to: paths.settings, label: 'Settings', icon: 'settings' },
]

export function Sidebar() {
  const { team, actions } = useCoachStore()
  const athleteApp = useAthleteStore()
  const navigate = useNavigate()
  const openAlerts = team.flagged.filter((a) => !actions[a.id]).length

  return (
    <aside className={styles.sidebar} aria-label="Main navigation">
      <Logo className={styles.brand} wordmarkClassName={styles.wordmark} />
      <nav className={styles.nav}>
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            title={item.label}
            className={({ isActive }) => cx(styles.link, isActive && styles.active)}
          >
            <Icon name={item.icon} size={19} />
            <span className={styles.label}>{item.label}</span>
            {item.to === paths.alerts && openAlerts > 0 && (
              <span className={styles.count}>
                {openAlerts}
                <span className={ui.srOnly}> open</span>
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className={styles.spacer} />
      <button
        type="button"
        className={styles.preview}
        title="Open athlete check-in"
        onClick={() => {
          athleteApp.signIn()
          navigate(paths.athleteApp.home)
        }}
      >
        <Icon name="phone" size={17} />
        <span className={styles.previewLabel}>Preview athlete check-in</span>
      </button>
      <div className={styles.account}>
        <div className={styles.coach}>
          <Avatar initials={TEAM.coach.initials} tone="dark" />
          <div className={styles.coachText}>
            <span className={styles.coachName}>{TEAM.coach.name}</span>
            <span className={styles.coachRole}>
              {TEAM.coach.role} · {TEAM.name}
            </span>
          </div>
        </div>
        <div className={styles.accountActions}>
          <button type="button" onClick={() => navigate(paths.settings)}>
            Notifications
          </button>
          <button type="button" onClick={() => navigate(paths.login)}>
            Log out
          </button>
        </div>
      </div>
    </aside>
  )
}
