import { Link, useNavigate } from 'react-router'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { Input } from '../../components/ui/Input'
import { Logo } from '../../components/ui/Logo'
import { useTitle } from '../../lib/useTitle'
import { paths } from '../../navigation/paths'
import ui from '../../styles/ui.module.css'
import styles from './Login.module.css'

// Authentication is mocked until the backend exists: every sign-in opens the dashboard.
export function Login() {
  useTitle('Sign in')
  const navigate = useNavigate()
  const signIn = () => navigate(paths.overview)

  return (
    <div className={styles.page}>
      <div className={styles.panel}>
        <Logo size={36} wordmarkSize={22} inverted wordmark="plain" className={styles.panelLogo} />
        <div className={styles.pitch}>
          <h1 className={styles.headline}>Healthier athletes. Safer teams. Smarter decisions.</h1>
          <p className={styles.tagline}>A simple safety layer for youth and amateur teams.</p>
        </div>
        <p className={styles.disclaimer}>
          CoachPulse highlights changes in wellbeing and training load. It doesn’t diagnose medical conditions.
        </p>
      </div>
      <div className={styles.formWrap}>
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault()
            signIn()
          }}
        >
          <div className={styles.heading}>
            <h2 className={styles.title}>Sign in</h2>
            <p className={styles.lead}>Welcome back, Coach.</p>
          </div>
          <label className={ui.field}>
            Email
            <Input type="email" leftIcon="email" placeholder="you@club.org" autoComplete="email" />
          </label>
          <label className={ui.field}>
            Password
            <Input type="password" leftIcon="lock" placeholder="Enter password" autoComplete="current-password" />
          </label>
          <div className={styles.row}>
            <label className={styles.remember}>
              <input type="checkbox" defaultChecked />
              Remember me
            </label>
            <button type="button" className={ui.linkButton}>
              Forgot password?
            </button>
          </div>
          <Button type="submit" fullWidth>
            Sign in
          </Button>
          <div className={styles.divider}>or</div>
          <button type="button" className={styles.google} onClick={signIn}>
            <Icon name="google" size={22} />
            Continue with Google
          </button>
          <p className={styles.signup}>
            Don’t have an account? <Link to={paths.setup}>Create team</Link>
          </p>
          <div className={styles.rule} />
          <Link to={paths.athleteApp.login} className={styles.athlete}>
            <Icon name="phone" size={16} />
            I’m an athlete — sign in to the athlete app
          </Link>
        </form>
      </div>
    </div>
  )
}
