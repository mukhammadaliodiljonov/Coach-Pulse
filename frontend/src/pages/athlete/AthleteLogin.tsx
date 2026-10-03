import { useNavigate } from 'react-router'
import { useAuth } from '../../auth/useAuth'
import { useSignInForm } from '../../auth/useSignInForm'
import { Button, ButtonLink } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { LogoMark } from '../../components/ui/Logo'
import { useTitle } from '../../lib/useTitle'
import { paths } from '../../navigation/paths'
import { useAthleteStore } from '../../state/athleteStore'
import ui from '../../styles/ui.module.css'
import styles from './athlete.module.css'

// With the backend, this signs in for real (see useSignInForm). With sample data it opens the demo athlete.
export function AthleteLogin() {
  useTitle('Athlete sign in')
  const demo = useAthleteStore()
  const { required } = useAuth()
  const backend = useSignInForm()
  const navigate = useNavigate()
  const error = required ? backend.message : demo.error
  const busy = required ? backend.submitting : demo.loading

  return (
    <div className={styles.scroll}>
      <form
        className={styles.auth}
        onSubmit={async (e) => {
          if (required) return backend.onSubmit(e)
          e.preventDefault()
          if (await demo.signIn()) navigate(paths.athleteApp.home)
        }}
      >
        <LogoMark size={52} />
        <div className={styles.heading}>
          <h1 className={styles.title}>Hi, athlete</h1>
          <p className={styles.lead}>Sign in to do your check-ins. It takes under a minute.</p>
        </div>
        <label className={ui.field}>
          {required ? 'Email' : 'Email or phone'}
          <Input
            name="email"
            type={required ? 'email' : 'text'}
            required={required}
            leftIcon="email"
            placeholder="alex@example.com"
            autoComplete="username"
          />
        </label>
        <label className={ui.field}>
          Password
          <Input
            name="password"
            type="password"
            required={required}
            leftIcon="lock"
            placeholder="Enter password"
            autoComplete="current-password"
          />
        </label>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <Button type="submit" fullWidth disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
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
