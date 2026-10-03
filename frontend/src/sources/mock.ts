import { RESOLVED_ALERTS, seedAudit } from '../data/activity'
import { ATHLETE_SELF, FEELING_WEEK, HISTORY, SAMPLE_TODAY } from '../data/athleteApp'
import { buildRoster, type Scenario } from '../data/roster'
import { TEAM } from '../data/team'
import { latestLoadChange } from '../data/trends'
import { evaluateAthlete, sortByAttention } from '../domain/signals'
import type { AuditEntry, CoachAction } from '../domain/types'
import { formatClock } from '../lib/time'
import type { AthleteSource, CoachSource, DailyCheckInInput } from './types'

// Sample data behind the same interface as the API. Anything saved is kept in memory,
// the way the server would keep it, so reloading doesn't lose it.

export function mockCoachSource(scenario: Scenario): CoachSource {
  const recorded: AuditEntry[] = []
  const actions: Partial<Record<string, CoachAction>> = {}

  return {
    startsOffline: scenario === 'offline',

    load() {
      // The loading demo never finishes.
      if (scenario === 'loading') return new Promise(() => {})
      return Promise.resolve({
        team: { name: TEAM.name, sport: TEAM.sport, ageGroup: TEAM.ageGroup, joinCode: TEAM.code },
        coach: { ...TEAM.coach },
        roster: sortByAttention(buildRoster(scenario).map((a) => evaluateAthlete(a))),
        audit: [...recorded, ...seedAudit(scenario)],
        pastAlerts: RESOLVED_ALERTS,
        actions: { ...actions },
        teamLoadChangePct: latestLoadChange(scenario),
      })
    },

    recordAction(athlete, action, notes) {
      const entry: AuditEntry = {
        id: crypto.randomUUID(),
        athleteId: athlete.id,
        time: `Today, ${formatClock(new Date())}`,
        who: TEAM.coach.shortName,
        text: `${action} — ${athlete.name}`,
        notes: notes.trim() || undefined,
        kind: 'action',
      }
      recorded.unshift(entry)
      actions[athlete.id] = action
      return Promise.resolve(entry)
    },
  }
}

export function mockAthleteSource(scenario: Scenario): AthleteSource {
  const completed = { daily: false, post: false }
  let today: DailyCheckInInput | null = null

  return {
    load() {
      const self = buildRoster(scenario).find((a) => a.id === ATHLETE_SELF.id)
      const todayValues: [number, number, number, number] = today
        ? [today.sleep, today.fatigue, today.soreness, today.wellness]
        : SAMPLE_TODAY
      return Promise.resolve({
        profile: {
          athleteId: ATHLETE_SELF.id,
          name: ATHLETE_SELF.name,
          firstName: ATHLETE_SELF.firstName,
          initials: ATHLETE_SELF.initials,
          position: ATHLETE_SELF.position,
          teamName: TEAM.name,
          coachName: TEAM.coach.shortName,
          coachInitials: TEAM.coach.initials,
          visibleTo: `Coach ${TEAM.coach.name} and assistant coach Priya Shah`,
        },
        completed: { ...completed },
        lastSevenDays: [true, true, true, true, true, true, completed.daily],
        coachFollowUp: self ? evaluateAthlete(self).status === 'high' : false,
        history: [
          { label: 'Today', values: todayValues },
          ...HISTORY.map((h) => ({ label: h.day, values: h.values, session: h.session })),
        ],
        feelingWeek: FEELING_WEEK.map((d, i) =>
          i === FEELING_WEEK.length - 1 && today ? { day: d.day, value: today.wellness } : d,
        ),
      })
    },

    submitDaily(input) {
      completed.daily = true
      today = input
      return Promise.resolve()
    },

    submitPostTraining() {
      completed.post = true
      return Promise.resolve()
    },
  }
}
