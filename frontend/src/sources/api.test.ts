import { afterEach, describe, expect, it, vi } from 'vitest'
import activity from './fixtures/backend-activity.json'
import alerts from './fixtures/backend-alerts.json'
import day from './fixtures/backend-day.json'
import me from './fixtures/backend-me.json'
import team from './fixtures/backend-team.json'
import { apiCoachSource } from './api'
import { NoTeamError } from './types'

// Fixtures are real responses from the Spring Boot backend: a coach whose team has one athlete with
// today's morning check-in, a workout with symptoms, an open RED alert and a resolved one.

const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } })

function stubBackend(routes: Record<string, unknown>) {
  const fetchMock = vi.fn(async (url: string) => {
    const path = url.replace(/^\/api/, '').split('?')[0]
    const match = Object.entries(routes).find(([pattern]) => new RegExp(`^${pattern}$`).test(path))
    return match ? json(match[1]) : new Response(null, { status: 404 })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('apiCoachSource with the real backend responses', () => {
  it('loads the coach dashboard', async () => {
    // The fixtures' "today", so the result doesn't depend on when the test runs.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-04T08:00:00+02:00'))
    stubBackend({
      '/me': me,
      '/teams/[^/]+': team,
      '/teams/[^/]+/athletes/today': day,
      '/teams/[^/]+/alerts': alerts,
      '/teams/[^/]+/activity': activity,
    })

    const snapshot = await apiCoachSource().load()

    expect(snapshot.team.name).toBe('Northside U17')
    expect(snapshot.team.joinCode).toBe(team.joinCode)
    expect(snapshot.coach.name).toContain('Rivera')
    expect(snapshot.roster).toHaveLength(1)
    expect(snapshot.roster[0]).toMatchObject({ firstName: 'Alex', status: 'high' })
    expect(snapshot.pastAlerts).toHaveLength(1)
    expect(snapshot.audit).toHaveLength(activity.length)
  })

  it('reports a coach without a team', async () => {
    stubBackend({ '/me': { ...me, teams: [] } })

    await expect(apiCoachSource().load()).rejects.toBeInstanceOf(NoTeamError)
  })
})
