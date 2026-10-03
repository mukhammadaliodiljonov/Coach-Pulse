import { useNavigate } from 'react-router'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Toggle } from '../../components/ui/Toggle'
import { ATHLETE_SELF, REMINDERS } from '../../data/athleteApp'
import { TEAM } from '../../data/team'
import { useTitle } from '../../lib/useTitle'
import { paths } from '../../navigation/paths'
import { useAthleteStore } from '../../state/athleteStore'
import styles from './athlete.module.css'

export function AthleteSelfProfile() {
  useTitle('Profile')
  const { reminders, toggleReminder, signOut } = useAthleteStore()
  const navigate = useNavigate()

  return (
    <div className={styles.stack} style={{ gap: 16 }}>
      <div className={styles.identity}>
        <Avatar initials={ATHLETE_SELF.initials} size={64} />
        <div className={styles.heading} style={{ gap: 2 }}>
          <h1 className={styles.identityName}>{ATHLETE_SELF.name}</h1>
          <span className={styles.sessionMeta}>
            {ATHLETE_SELF.position} · {TEAM.name}
          </span>
        </div>
      </div>
      <div className={styles.toggles}>
        {REMINDERS.map((r) => (
          <div key={r.key} className={styles.toggleRow}>
            <div className={styles.toggleText}>
              <span className={styles.toggleLabel}>{r.label}</span>
              <span className={styles.toggleSub}>{r.sub}</span>
            </div>
            <Toggle checked={reminders[r.key]} onChange={() => toggleReminder(r.key)} label={r.label} />
          </div>
        ))}
      </div>
      <div className={styles.infoCard}>
        <span className={styles.toggleLabel}>Parent / guardian</span>
        <span className={styles.infoText}>{ATHLETE_SELF.guardian}</span>
      </div>
      <div className={styles.plainCard}>
        <span className={styles.toggleLabel}>Who can see my answers</span>
        <span className={styles.plainText}>
          Coach {TEAM.coach.name} and assistant coach Priya Shah. CoachPulse doesn’t share your answers with teammates.
        </span>
      </div>
      <Button
        variant="outline"
        size="md"
        fullWidth
        onClick={() => {
          signOut()
          navigate(paths.athleteApp.login)
        }}
      >
        Log out
      </Button>
    </div>
  )
}
