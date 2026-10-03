import { afterEach, describe, expect, it, vi } from 'vitest'
import { currentToken, endSession, getAuthState, isExpired, parseToken, startSession } from './session'
import { fakeToken, inMinutes } from './testTokens'

afterEach(() => {
  endSession('signed-out')
  vi.useRealTimers()
})

describe('parseToken', () => {
  it('reads the subject, role and expiry', () => {
    const exp = inMinutes(15)
    const token = fakeToken({ sub: 'user-1', role: 'COACH', iat: exp - 900, exp })

    expect(parseToken(token)).toEqual({ token, userId: 'user-1', role: 'COACH', expiresAt: exp * 1000 })
  })

  it('rejects tokens without a known role, subject or expiry', () => {
    expect(parseToken(fakeToken({ sub: 'u', role: 'SUPERUSER', exp: inMinutes(5) }))).toBeNull()
    expect(parseToken(fakeToken({ sub: 'u', role: 'coach', exp: inMinutes(5) }))).toBeNull()
    expect(parseToken(fakeToken({ sub: 'u', exp: inMinutes(5) }))).toBeNull()
    expect(parseToken(fakeToken({ role: 'COACH', exp: inMinutes(5) }))).toBeNull()
    expect(parseToken(fakeToken({ sub: 'u', role: 'COACH' }))).toBeNull()
  })

  it('rejects malformed tokens', () => {
    expect(parseToken('')).toBeNull()
    expect(parseToken('not-a-jwt')).toBeNull()
    expect(parseToken('a.%%%.c')).toBeNull()
    expect(parseToken(`a.${btoa('"just a string"')}.c`)).toBeNull()
  })
})

describe('session', () => {
  it('starts from a valid token and ends on sign-out', () => {
    const token = fakeToken({ sub: 'u1', role: 'ATHLETE', exp: inMinutes(15) })

    startSession(token)
    expect(getAuthState().session?.role).toBe('ATHLETE')
    expect(currentToken()).toBe(token)

    endSession('signed-out')
    expect(getAuthState()).toEqual({ session: null, ended: 'signed-out' })
    expect(currentToken()).toBeNull()
  })

  it('refuses expired or invalid tokens', () => {
    expect(() => startSession(fakeToken({ sub: 'u1', role: 'COACH', exp: inMinutes(-1) }))).toThrow()
    expect(() => startSession('garbage')).toThrow()
    expect(getAuthState().session).toBeNull()
  })

  it('ends itself when the token expires', () => {
    vi.useFakeTimers()
    const session = startSession(fakeToken({ sub: 'u1', role: 'COACH', exp: inMinutes(1) }))

    vi.advanceTimersByTime(59_000)
    expect(getAuthState().session).not.toBeNull()

    vi.advanceTimersByTime(2_000)
    expect(isExpired(session)).toBe(true)
    expect(getAuthState()).toEqual({ session: null, ended: 'expired' })
  })
})
