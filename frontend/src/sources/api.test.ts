import { afterEach, describe, expect, it, vi } from 'vitest'
import activity from './fixtures/backend-activity.json'
import alerts from './fixtures/backend-alerts.json'
import athleteCheckins from './fixtures/backend-athlete-checkins.json'
import athleteMe from './fixtures/backend-athlete-me.json'
import athleteTeam from './fixtures/backend-athlete-team.json'
import athleteToday from './fixtures/backend-athlete-today.json'
import day from './fixtures/backend-day.json'
import me from './fixtures/backend-me.json'
import team from './fixtures/backend-team.json'
import { apiAthleteSource, apiCoachSource } from './api'
import { NoTeamError } from './types'

// Fixtures are real responses from the Spring Boot backend: a coach whose team has one athlete with
// today's morning check-in, a workout with symptoms, an open RED alert and a resolved one; and an athlete
// who joined that team, checked in today and has an open RED alert.

const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } })

function stubBackend(routes: Record<string, unknown>) {
  const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => {
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

describe('apiAthleteSource with the real backend responses', () => {
  const athleteRoutes = {
    '/me': athleteMe,
    '/teams/[^/]+': athleteTeam,
    '/athletes/[^/]+/today': athleteToday,
    '/athletes/[^/]+/checkins': athleteCheckins,
  }

  it('loads the athlete app', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-04T08:00:00+02:00'))
    stubBackend(athleteRoutes)

    const snapshot = await apiAthleteSource().load()

    expect(snapshot.profile).toMatchObject({ firstName: 'Emma', teamName: 'Northside U17', coachName: 'Coach Rivera' })
    expect(snapshot.completed).toEqual({ daily: true, post: true })
    expect(snapshot.coachFollowUp).toBe(true)
    expect(snapshot.history).toHaveLength(7)
    expect(snapshot.history[0]).toMatchObject({ label: 'Today', values: [2, 4, 3, 2] })
    expect(snapshot.feelingWeek).toHaveLength(7)
  })

  it('sends a daily check-in with its symptoms to the athlete’s own endpoint', async () => {
    const fetchMock = stubBackend({ ...athleteRoutes, '/athletes/[^/]+/morning-checkins': {} })
    const source = apiAthleteSource()
    await source.load()

    await source.submitDaily({ sleep: 2, fatigue: 4, soreness: 3, wellness: 2, symptoms: ['Nausea', 'Confusion'] })

    const [url, init] = fetchMock.mock.calls.at(-1)!
    expect(url).toBe(`/api/athletes/${athleteMe.athleteId}/morning-checkins`)
    expect(JSON.parse(String(init?.body))).toEqual({
      sleepQuality: 2,
      fatigue: 4,
      muscleSoreness: 3,
      overallWellness: 2,
      symptoms: ['NAUSEA', 'CONFUSION'],
    })
  })
})

