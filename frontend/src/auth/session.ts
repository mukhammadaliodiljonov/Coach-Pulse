import type { UserRole } from '../api/types'

/**
 * The signed-in user, read from the backend's JWT.
 *
 * The token's claims are decoded but not verified here: the browser has no key to verify them with,
 * and doesn't need one. They only decide which screens to show; the backend verifies the token on
 * every request and enforces roles itself.
 */
export interface Session {
  token: string
  userId: string
  role: UserRole
  /** Epoch milliseconds. */
  expiresAt: number
}

/** Why the last session ended, to explain it on the sign-in screen. */
export type SignOutReason = 'signed-out' | 'expired'

export interface AuthState {
  session: Session | null
  ended: SignOutReason | null
}

const ROLES: readonly UserRole[] = ['ATHLETE', 'COACH', 'ADMIN']

/** Reads a JWT's subject, role and expiry; null for anything that isn't a usable CoachPulse token. */
export function parseToken(token: string): Session | null {
  const payload = token.split('.')[1]
  if (!payload) return null
  let claims: unknown
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '=')
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
    claims = JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    return null
  }
  if (!claims || typeof claims !== 'object') return null
  const { sub, role, exp } = claims as Record<string, unknown>
  if (typeof sub !== 'string' || !sub) return null
  if (typeof role !== 'string' || !ROLES.includes(role as UserRole)) return null
  if (typeof exp !== 'number') return null
  return { token, userId: sub, role: role as UserRole, expiresAt: exp * 1000 }
}

export function isExpired(session: Session, now = Date.now()): boolean {
  return now >= session.expiresAt
}

// sessionStorage keeps the token for this tab only: it survives a reload, and is gone when the tab closes.
// It can be unavailable (private mode, blocked storage, tests); then the session lasts until reload.
const STORAGE_KEY = 'coachpulse.session'

function readStoredToken(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function storeToken(token: string | null) {
  try {
    if (token) sessionStorage.setItem(STORAGE_KEY, token)
    else sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage unavailable: keep the session in memory only.
  }
}

let state: AuthState | null = null
let expiryTimer: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<() => void>()

function setState(next: AuthState) {
  state = next
  clearTimeout(expiryTimer)
  if (next.session) {
    // Long timeouts overflow setTimeout's 32-bit delay; cap them and re-check.
    const delay = Math.min(next.session.expiresAt - Date.now(), 2 ** 31 - 1)
    expiryTimer = setTimeout(() => {
      if (state?.session && isExpired(state.session)) endSession('expired')
      else if (state) setState(state)
    }, delay)
  }
  listeners.forEach((listener) => listener())
}

function initialState(): AuthState {
  const token = readStoredToken()
  if (!token) return { session: null, ended: null }
  const session = parseToken(token)
  if (session && !isExpired(session)) return { session, ended: null }
  storeToken(null)
  return { session: null, ended: session ? 'expired' : null }
}

export function getAuthState(): AuthState {
  if (!state) setState(initialState())
  return state!
}

export function subscribeAuth(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Starts a session from a token the backend issued. Throws if the token isn't usable. */
export function startSession(token: string): Session {
  const session = parseToken(token)
  if (!session || isExpired(session)) throw new Error('The server returned an invalid sign-in token.')
  storeToken(token)
  setState({ session, ended: null })
  return session
}

export function endSession(reason: SignOutReason) {
  storeToken(null)
  setState({ session: null, ended: reason })
}

/** The token to send with API requests, or null when signed out or expired. */
export function currentToken(): string | null {
  const { session } = getAuthState()
  if (!session) return null
  if (isExpired(session)) {
    endSession('expired')
    return null
  }
  return session.token
}
