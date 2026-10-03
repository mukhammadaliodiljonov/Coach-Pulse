import { describe, expect, it } from 'vitest'
import type { UserRole } from '../api/types'
import { afterSignIn, decideRoute } from './access'
import type { Session } from './session'

const session = (role: UserRole, expiresAt = Date.now() + 60_000): Session => ({
  token: 't',
  userId: 'u1',
  role,
  expiresAt,
})

describe('decideRoute', () => {
  it('sends signed-out users to the sign-in page for that app', () => {
    expect(decideRoute(null, 'coach')).toEqual({ kind: 'login', to: '/login' })
    expect(decideRoute(null, 'athlete')).toEqual({ kind: 'login', to: '/athlete/login' })
  })

  it('treats an expired session as signed out', () => {
    expect(decideRoute(session('COACH', Date.now() - 1), 'coach')).toEqual({ kind: 'login', to: '/login' })
  })

  it('lets coaches and admins into the coach app, athletes into the athlete app', () => {
    expect(decideRoute(session('COACH'), 'coach')).toEqual({ kind: 'allow' })
    expect(decideRoute(session('ADMIN'), 'coach')).toEqual({ kind: 'allow' })
    expect(decideRoute(session('ATHLETE'), 'athlete')).toEqual({ kind: 'allow' })
  })

  it('sends users outside their role to their own home', () => {
    expect(decideRoute(session('ATHLETE'), 'coach')).toEqual({ kind: 'redirect', to: '/athlete' })
    expect(decideRoute(session('COACH'), 'athlete')).toEqual({ kind: 'redirect', to: '/' })
    expect(decideRoute(session('ADMIN'), 'athlete')).toEqual({ kind: 'redirect', to: '/' })
  })
})

describe('afterSignIn', () => {
  it('returns to the page that asked for sign-in when the role may see it', () => {
    expect(afterSignIn('COACH', '/alerts?filter=high')).toBe('/alerts?filter=high')
    expect(afterSignIn('ATHLETE', '/athlete/history')).toBe('/athlete/history')
  })

  it('goes to the role’s home for pages outside the role', () => {
    expect(afterSignIn('ATHLETE', '/alerts')).toBe('/athlete')
    expect(afterSignIn('COACH', '/athlete/check-in/daily')).toBe('/')
  })

  it('ignores missing, sign-in and off-site destinations', () => {
    expect(afterSignIn('COACH', undefined)).toBe('/')
    expect(afterSignIn('COACH', '/login')).toBe('/')
    expect(afterSignIn('COACH', '/signup')).toBe('/')
    expect(afterSignIn('ATHLETE', '/athlete/login')).toBe('/athlete')
    expect(afterSignIn('COACH', 'https://evil.example/')).toBe('/')
    expect(afterSignIn('COACH', '//evil.example/')).toBe('/')
  })
})
