import { useSyncExternalStore } from 'react'
import { api } from '../api/endpoints'
import { DATA_SOURCE } from '../sources'
import { endSession, getAuthState, startSession, subscribeAuth, type Session, type SignOutReason } from './session'

/** Sign-in is only enforced against the backend; sample data stays an open demo. */
export const AUTH_REQUIRED = DATA_SOURCE === 'api'

export interface Auth {
  required: boolean
  session: Session | null
  /** Why the last session ended, if it did. */
  ended: SignOutReason | null
  /** Rejects with an ApiError when the credentials are wrong or the server can't be reached. */
  signIn: (email: string, password: string) => Promise<Session>
  signOut: () => void
}

async function signIn(email: string, password: string): Promise<Session> {
  const { accessToken } = await api.login({ email, password })
  return startSession(accessToken)
}

function signOut() {
  if (getAuthState().session) {
    // Logout is stateless on the server; the token is discarded here either way.
    void api.logout().catch(() => {})
  }
  endSession('signed-out')
}

export function useAuth(): Auth {
  const { session, ended } = useSyncExternalStore(subscribeAuth, getAuthState)
  return { required: AUTH_REQUIRED, session, ended, signIn, signOut }
}
