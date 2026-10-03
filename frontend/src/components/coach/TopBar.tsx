import { TEAM } from '../../data/team'
import { useCoachStore } from '../../state/coachStore'
import { Icon } from '../ui/Icon'
import { Logo } from '../ui/Logo'
import { NotificationCenter } from './NotificationCenter'
import styles from './TopBar.module.css'
import { useAssistant } from './useAssistant'

export function TopBar() {
  const { team } = useCoachStore()
  const assistant = useAssistant()
  return (
    <div className={styles.bar}>
      <Logo size={32} wordmarkSize={17} className={styles.mobileLogo} />
      <div className={styles.teamChip}>
        <span className={styles.teamDot} aria-hidden="true" />
        {TEAM.name} · {TEAM.sport} · {team.size} athletes
      </div>
      <span className={styles.spacer} />
      <button
        type="button"
        className={styles.ask}
        aria-label="Ask CoachPulse"
        aria-expanded={assistant.open}
        onClick={() => assistant.setOpen(!assistant.open)}
      >
        <Icon name="chat" size={18} />
        <span className={styles.askLabel} aria-hidden="true">
          Ask CoachPulse
        </span>
      </button>
      <NotificationCenter />
    </div>
  )
}
