import { Navigate, Outlet, useLocation } from 'react-router'
import { afterSignIn, decideRoute, type AppArea } from './access'
import { useAuth } from './useAuth'

export interface SignInLocationState {
  /** The page that asked for sign-in, to return to afterwards. */
  from?: string
}

/** Pages in `area` need a signed-in user whose role may see them. */
export function RequireArea({ area }: { area: AppArea }) {
  const { required, session } = useAuth()
  const location = useLocation()
  if (!required) return <Outlet />

  const decision = decideRoute(session, area)
  if (decision.kind === 'login') {
    const state: SignInLocationState = { from: location.pathname + location.search + location.hash }
    return <Navigate to={decision.to} replace state={state} />
  }
  if (decision.kind === 'redirect') return <Navigate to={decision.to} replace />
  return <Outlet />
}

/** Sign-in pages: a signed-in user goes on to where they were headed, or their home. */
export function RedirectIfSignedIn() {
  const { required, session } = useAuth()
  const location = useLocation()
  if (!required || !session) return <Outlet />
  const from = (location.state as SignInLocationState | null)?.from
  return <Navigate to={afterSignIn(session.role, from)} replace />
}
