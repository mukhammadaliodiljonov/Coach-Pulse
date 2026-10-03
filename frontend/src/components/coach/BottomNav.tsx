import { NavLink } from 'react-router'
import { cx } from '../../lib/cx'
import { paths } from '../../navigation/paths'
import { Icon } from '../ui/Icon'
import type { IconName } from '../ui/iconPaths'
import styles from './BottomNav.module.css'
import { useAssistant } from './useAssistant'

const LINKS: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: paths.overview, label: 'Overview', icon: 'home', end: true },
  { to: paths.athletes(), label: 'Athletes', icon: 'user' },
  { to: paths.alerts, label: 'Alerts', icon: 'bell' },
]

/** Floating purple nav below 760px. */
export function BottomNav() {
  const { open: assistantOpen, setOpen: setAssistantOpen } = useAssistant()
  return (
    <nav className={styles.nav} aria-label="Main navigation">
      {LINKS.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) => cx(styles.item, isActive && !assistantOpen && styles.active)}
        >
          <span className={styles.icon}>
            <Icon name={link.icon} size={20} />
          </span>
          {link.label}
        </NavLink>
      ))}
      <button
        type="button"
        className={cx(styles.item, assistantOpen && styles.active)}
        aria-expanded={assistantOpen}
        onClick={() => setAssistantOpen(true)}
      >
        <span className={styles.icon}>
          <Icon name="chat" size={20} />
        </span>
        Assistant
      </button>
    </nav>
  )
}
