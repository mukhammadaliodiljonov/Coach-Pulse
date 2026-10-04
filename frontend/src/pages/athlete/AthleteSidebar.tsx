import { NavLink, useNavigate } from 'react-router'
import { useAuth } from '../../auth/useAuth'
import sidebar from '../../components/coach/Sidebar.module.css'
import { Avatar } from '../../components/ui/Avatar'
import { Icon } from '../../components/ui/Icon'
import { Logo } from '../../components/ui/Logo'
import { cx } from '../../lib/cx'
import { paths } from '../../navigation/paths'
import { useAthleteStore } from '../../state/athleteStore'
import { ATHLETE_TABS } from './athleteTabs'

/** The athlete app's navigation on wider screens, styled like the coach sidebar (hidden on phones). */
export function AthleteSidebar() {
  const { snapshot, signOut: clearAthlete } = useAthleteStore()
  const auth = useAuth()
  const navigate = useNavigate()
  const profile = snapshot?.profile

  return (
    <aside className={sidebar.sidebar} aria-label="Main navigation">
      <Logo className={sidebar.brand} wordmarkClassName={sidebar.wordmark} />
      <nav className={sidebar.nav}>
        {ATHLETE_TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            title={tab.label}
            className={({ isActive }) => cx(sidebar.link, isActive && sidebar.active)}
          >
            <Icon name={tab.icon} size={19} />
            <span className={sidebar.label}>{tab.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className={sidebar.spacer} />
      <div className={sidebar.account}>
        {profile && (
          <div className={sidebar.coach}>
            <Avatar initials={profile.initials} tone="dark" />
            <div className={sidebar.coachText}>
              <span className={sidebar.coachName}>{profile.name}</span>
              <span className={sidebar.coachRole}>Athlete · {profile.teamName}</span>
            </div>
          </div>
        )}
        <div className={sidebar.accountActions}>
          {/* Switching between the apps is a sample-data demo; real accounts have one role. */}
          {!auth.required && (
            <button type="button" onClick={() => navigate(paths.overview)}>
              Coach view
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              clearAthlete()
              auth.signOut()
              navigate(paths.athleteApp.login)
            }}
          >
            Log out
          </button>
        </div>
      </div>
    </aside>
  )
}
