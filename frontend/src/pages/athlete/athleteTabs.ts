import type { IconName } from '../../components/ui/iconPaths'
import { paths } from '../../navigation/paths'

/** The athlete app's sections, in the sidebar and the phone bottom nav. */
export const ATHLETE_TABS: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: paths.athleteApp.home, label: 'Home', icon: 'home', end: true },
  { to: paths.athleteApp.history, label: 'History', icon: 'stats' },
  { to: paths.athleteApp.schedule, label: 'Schedule', icon: 'calendar' },
  { to: paths.athleteApp.profile, label: 'Profile', icon: 'user' },
]
