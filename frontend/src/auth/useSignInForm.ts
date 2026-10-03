import { useState, type FormEvent } from 'react'
import { describeError } from '../api/client'
import { useAuth } from './useAuth'

const EXPIRED = 'Your session has expired. Sign in again.'

/**
 * Backend sign-in for the coach and athlete sign-in forms. On success the session updates and
 * RedirectIfSignedIn moves on, so the form has nothing else to do.
 */
export function useSignInForm() {
  const { signIn, ended } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setSubmitting(true)
    setError(null)
    try {
      await signIn(String(form.get('email') ?? '').trim(), String(form.get('password') ?? ''))
    } catch (e) {
      setError(describeError(e))
      setSubmitting(false)
    }
  }

  return { onSubmit, submitting, message: error ?? (ended === 'expired' ? EXPIRED : null) }
}
