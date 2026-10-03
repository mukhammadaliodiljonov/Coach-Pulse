import { useAuth } from '../../auth/useAuth'
import { useNavigate } from 'react-router'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { SampleDataNote } from '../../components/ui/SampleDataNote'
import { Toggle } from '../../components/ui/Toggle'
import { ATHLETE_SELF, REMINDERS } from '../../data/athleteApp'
import { useTitle } from '../../lib/useTitle'
import { paths } from '../../navigation/paths'
import { useAthleteStore } from '../../state/athleteStore'
import styles from './athlete.module.css'

export function AthleteSelfProfile() {
  useTitle('Profile')
  const { snapshot, reminders, toggleReminder, signOut } = useAthleteStore()
  const auth = useAuth()
  const navigate = useNavigate()
  if (!snapshot) return null
  const { profile } = snapshot

  return (
    <div className={styles.stack} style={{ gap: 16 }}>
      <div className={styles.identity}>
        <Avatar initials={profile.initials} size={64} />
        <div className={styles.heading} style={{ gap: 2 }}>
          <h1 className={styles.identityName}>{profile.name}</h1>
          <span className={styles.sessionMeta}>
            {profile.position ? `${profile.position} · ` : ''}
            {profile.teamName}
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
      <SampleDataNote>Reminders and the guardian contact are sample data until the profile API exists.</SampleDataNote>
      <div className={styles.plainCard}>
        <span className={styles.toggleLabel}>Who can see my answers</span>
        <span className={styles.plainText}>
          {profile.visibleTo}. CoachPulse doesn’t share your answers with teammates.
        </span>
      </div>
      <Button
        variant="outline"
        size="md"
        fullWidth
        onClick={() => {
          signOut()
          auth.signOut()
          navigate(paths.athleteApp.login)
        }}
      >
        Log out
      </Button>
    </div>
  )
}
