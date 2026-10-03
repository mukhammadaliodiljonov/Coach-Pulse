import { Link, useNavigate } from 'react-router'
import { useAuth } from '../../auth/useAuth'
import { useSignInForm } from '../../auth/useSignInForm'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { Input } from '../../components/ui/Input'
import { useTitle } from '../../lib/useTitle'
import { paths } from '../../navigation/paths'
import { AuthPanel } from './AuthPanel'
import ui from '../../styles/ui.module.css'
import styles from './Login.module.css'

// With the backend, this signs in for real (see useSignInForm). With sample data every sign-in opens the dashboard.
export function Login() {
  useTitle('Sign in')
  const navigate = useNavigate()
  const { required } = useAuth()
  const backend = useSignInForm()
  const demoSignIn = () => navigate(paths.overview)

  return (
    <div className={styles.page}>
      <AuthPanel />
      <div className={styles.formWrap}>
        <form
          className={styles.form}
          onSubmit={(e) => {
            if (required) return void backend.onSubmit(e)
            e.preventDefault()
            demoSignIn()
          }}
        >
          <div className={styles.heading}>
            <h2 className={styles.title}>Sign in</h2>
            <p className={styles.lead}>Welcome back, Coach.</p>
          </div>
          <label className={ui.field}>
            Email
            <Input name="email" type="email" required={required} leftIcon="email" placeholder="you@club.org" autoComplete="email" />
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
          {required && backend.message && (
            <p className={styles.error} role="alert">
              {backend.message}
            </p>
          )}
          <div className={styles.row}>
            {/* The session lasts for this tab only, so "remember me" is demo-only for now. */}
            {!required && (
              <label className={styles.remember}>
                <input type="checkbox" defaultChecked />
                Remember me
              </label>
            )}
            <button type="button" className={ui.linkButton}>
              Forgot password?
            </button>
          </div>
          <Button type="submit" fullWidth disabled={required && backend.submitting}>
            {required && backend.submitting ? 'Signing in…' : 'Sign in'}
          </Button>
          {/* The backend has no Google sign-in yet. */}
          {!required && (
            <>
              <div className={styles.divider}>or</div>
              <button type="button" className={styles.google} onClick={demoSignIn}>
                <Icon name="google" size={22} />
                Continue with Google
              </button>
            </>
          )}
          <p className={styles.signup}>
            Don’t have an account?{' '}
            {required ? <Link to={paths.signup}>Create account</Link> : <Link to={paths.setup}>Create team</Link>}
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
