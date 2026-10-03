import type { UserRole } from '../api/types'
import { paths } from '../navigation/paths'
import { isExpired, type Session } from './session'

// Which signed-in users may open which part of the app. This only shapes navigation:
// the backend checks the token and the role on every request.

export type AppArea = 'coach' | 'athlete'

const AREA_ROLES: Record<AppArea, readonly UserRole[]> = {
  coach: ['COACH', 'ADMIN'],
  athlete: ['ATHLETE'],
}

export function canAccess(role: UserRole, area: AppArea): boolean {
  return AREA_ROLES[area].includes(role)
}

export function homeFor(role: UserRole): string {
  return canAccess(role, 'athlete') ? paths.athleteApp.home : paths.overview
}

export function loginFor(area: AppArea): string {
  return area === 'athlete' ? paths.athleteApp.login : paths.login
}

export function areaOf(pathname: string): AppArea {
  return pathname === '/athlete' || pathname.startsWith('/athlete/') ? 'athlete' : 'coach'
}

export type RouteDecision = { kind: 'allow' } | { kind: 'login'; to: string } | { kind: 'redirect'; to: string }

/** What to do when someone opens a page in `area`. */
export function decideRoute(session: Session | null, area: AppArea, now = Date.now()): RouteDecision {
  if (!session || isExpired(session, now)) return { kind: 'login', to: loginFor(area) }
  if (!canAccess(session.role, area)) return { kind: 'redirect', to: homeFor(session.role) }
  return { kind: 'allow' }
}

const PUBLIC_PATHS: readonly string[] = [paths.login, paths.signup, paths.setup, paths.athleteApp.login, paths.athleteApp.join]

/**
 * Where to go after signing in: back to the page that asked for sign-in when this role may see it,
 * otherwise the role's home. Only app-relative paths are followed.
 */
export function afterSignIn(role: UserRole, from: unknown): string {
  if (typeof from !== 'string' || !from.startsWith('/') || from.startsWith('//')) return homeFor(role)
  const pathname = from.split(/[?#]/)[0]
  if (PUBLIC_PATHS.includes(pathname) || !canAccess(role, areaOf(pathname))) return homeFor(role)
  return from
}
