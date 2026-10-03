import { afterEach, describe, expect, it, vi } from 'vitest'
import { endSession, getAuthState, startSession } from '../auth/session'
import { fakeToken, inMinutes } from '../auth/testTokens'
import { ApiError, apiRequest, describeError } from './client'

const json = (status: number, body: unknown, contentType = 'application/json') =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': contentType } })

afterEach(() => {
  vi.unstubAllGlobals()
  endSession('signed-out')
})

describe('apiRequest', () => {
  it('sends JSON and returns the parsed body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(201, { id: 'a1' }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiRequest('/athletes/x/actions', { method: 'POST', body: { action: 'OTHER' } })).resolves.toEqual({
      id: 'a1',
    })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/athletes/x/actions')
    expect(init).toMatchObject({ method: 'POST', body: '{"action":"OTHER"}' })
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' })
  })

  it('turns a problem detail into an ApiError', async () => {
    const problem = { title: 'Not Found', status: 404, detail: 'Team not found', timestamp: '2026-10-05T08:00:00Z' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(404, problem, 'application/problem+json')))

    const error = await apiRequest('/teams/t1').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 404, message: 'Team not found', problem })
  })

  it('keeps validation errors from the problem detail', async () => {
    const problem = { title: 'Bad Request', status: 400, detail: 'Validation failed', errors: { rpe: 'must be ≤ 10' } }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(400, problem)))

    const error = (await apiRequest('/x').catch((e: unknown) => e)) as ApiError
    expect(error.problem?.errors).toEqual({ rpe: 'must be ≤ 10' })
  })

  it('reports a network failure as status 0', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    const error = (await apiRequest('/me').catch((e: unknown) => e)) as ApiError
    expect(error.isNetworkError).toBe(true)
    expect(describeError(error)).toMatch(/Couldn’t reach the CoachPulse server/)
  })

  it('treats a proxy’s bad-gateway answer as an unreachable server', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Bad gateway', { status: 502 })))

    const error = (await apiRequest('/me').catch((e: unknown) => e)) as ApiError
    expect(error).toMatchObject({ status: 502, message: 'Request failed (502)', isUnreachable: true, isNetworkError: false })
    expect(describeError(error)).toMatch(/Couldn’t reach the CoachPulse server/)
  })
})

describe('apiRequest authentication', () => {
  it('sends no Authorization header when signed out', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(200, {}))
    vi.stubGlobal('fetch', fetchMock)

    await apiRequest('/me')
    expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty('Authorization')
  })

  it('sends the session’s JWT as a bearer token', async () => {
    const token = fakeToken({ sub: 'u1', role: 'COACH', exp: inMinutes(15) })
    startSession(token)
    const fetchMock = vi.fn().mockResolvedValue(json(200, {}))
    vi.stubGlobal('fetch', fetchMock)

    await apiRequest('/me')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/me')
    expect(init.headers).toMatchObject({ Authorization: `Bearer ${token}` })
  })

  it('ends the session when the server rejects the token', async () => {
    startSession(fakeToken({ sub: 'u1', role: 'COACH', exp: inMinutes(15) }))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })))

    await expect(apiRequest('/me')).rejects.toMatchObject({ status: 401 })
    expect(getAuthState()).toEqual({ session: null, ended: 'expired' })
  })

  it('keeps the session on a 403: the user is signed in but not allowed', async () => {
    startSession(fakeToken({ sub: 'u1', role: 'ATHLETE', exp: inMinutes(15) }))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(403, { status: 403, detail: 'Forbidden' })))

    await expect(apiRequest('/teams/t1')).rejects.toMatchObject({ status: 403 })
    expect(getAuthState().session).not.toBeNull()
  })
})

