import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router'
import { describeFormError } from '../../api/client'
import { api } from '../../api/endpoints'
import { useAuth } from '../../auth/useAuth'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useTitle } from '../../lib/useTitle'
import { paths } from '../../navigation/paths'
import ui from '../../styles/ui.module.css'
import { AuthPanel } from './AuthPanel'
import styles from './Login.module.css'

/**
 * Creates a coach account with the backend, then signs in with it. RedirectIfSignedIn then opens the
 * dashboard. Athletes don't sign up here: they join a coach's team.
 */
export function SignUp() {
  useTitle('Create account')
  const { required, signIn } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sample data has no accounts; its demo starts at team setup.
  if (!required) return <Navigate to={paths.setup} replace />

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const value = (name: string) => String(form.get(name) ?? '').trim()
    const email = value('email')
    const password = String(form.get('password') ?? '')
    setSubmitting(true)
    setError(null)
    try {
      await api.register({ email, password, firstName: value('firstName'), lastName: value('lastName') })
      await signIn(email, password)
    } catch (e) {
      setError(describeFormError(e))
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      <AuthPanel />
      <div className={styles.formWrap}>
        <form className={styles.form} onSubmit={(e) => void onSubmit(e)}>
          <div className={styles.heading}>
            <h2 className={styles.title}>Create your account</h2>
            <p className={styles.lead}>For coaches. Athletes join with their coach’s team code.</p>
          </div>
          <div className={styles.names}>
            <label className={ui.field}>
              First name
              <Input name="firstName" required maxLength={100} autoComplete="given-name" />
            </label>
            <label className={ui.field}>
              Last name
              <Input name="lastName" required maxLength={100} autoComplete="family-name" />
            </label>
          </div>
          <label className={ui.field}>
            Email
            <Input name="email" type="email" required maxLength={255} leftIcon="email" placeholder="you@club.org" autoComplete="email" />
          </label>
          <label className={ui.field}>
            Password
            <Input
              name="password"
              type="password"
              required
              minLength={8}
              maxLength={128}
              leftIcon="lock"
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
            <span className={styles.hint}>8 to 128 characters.</span>
          </label>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <Button type="submit" fullWidth disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
          </Button>
          <p className={styles.signup}>
            Already have an account? <Link to={paths.login}>Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
