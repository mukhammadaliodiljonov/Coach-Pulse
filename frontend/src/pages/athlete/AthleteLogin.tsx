import { useNavigate } from 'react-router'
import { Button, ButtonLink } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { LogoMark } from '../../components/ui/Logo'
import { useTitle } from '../../lib/useTitle'
import { paths } from '../../navigation/paths'
import { useAthleteStore } from '../../state/athleteStore'
import ui from '../../styles/ui.module.css'
import styles from './athlete.module.css'

// Authentication is mocked until the backend exists.
export function AthleteLogin() {
  useTitle('Athlete sign in')
  const { signIn } = useAthleteStore()
  const navigate = useNavigate()

  return (
    <div className={styles.scroll}>
      <form
        className={styles.auth}
        onSubmit={(e) => {
          e.preventDefault()
          signIn()
          navigate(paths.athleteApp.home)
        }}
      >
        <LogoMark size={52} />
        <div className={styles.heading}>
          <h1 className={styles.title}>Hi, athlete</h1>
          <p className={styles.lead}>Sign in to do your check-ins. It takes under a minute.</p>
        </div>
        <label className={ui.field}>
          Email or phone
          <Input leftIcon="email" placeholder="alex@example.com" autoComplete="username" />
        </label>
        <label className={ui.field}>
          Password
          <Input type="password" leftIcon="lock" placeholder="Enter password" autoComplete="current-password" />
        </label>
        <Button type="submit" fullWidth>
          Sign in
        </Button>
        <div className={styles.grow} />
        <div className={styles.newTeam}>
          <span className={styles.cardTitle}>New to a team?</span>
          <span className={styles.plainText}>Your coach will share a team code.</span>
          <ButtonLink variant="white" size="md" fullWidth to={paths.athleteApp.join}>
            Join with team code
          </ButtonLink>
        </div>
      </form>
    </div>
  )
}
