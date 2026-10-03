import {
  actionsFromDay,
  actionToAuditEntry,
  CODE_BY_ACTION,
  CODE_BY_SYMPTOM,
  teamLoadChange,
  toAthlete,
  toAthleteProfile,
  toAuditEntry,
  toCoachInfo,
  toFeelingWeek,
  toHistoryDays,
  toPastAlert,
  toTeamInfo,
} from '../api/adapters'
import { api } from '../api/endpoints'
import { sortByAttention } from '../domain/signals'
import type { AthleteSource, CoachSource } from './types'

// The Spring Boot backend, through the endpoints in docs/api-contract.md.

export function apiCoachSource(): CoachSource {
  return {
    async load(signal) {
      const me = await api.getMe(signal)
      const membership = me.teams.find((t) => t.memberRole !== 'ATHLETE')
      if (!membership) throw new Error('This account isn’t a coach on any team yet.')
      const teamId = membership.teamId

      const [team, day, pastAlerts, activity] = await Promise.all([
        api.getTeam(teamId, signal),
        api.getTeamDay(teamId, signal),
        api.getAlerts(teamId, { status: 'RESOLVED', limit: 20 }, signal),
        api.getActivity(teamId, 50, signal),
      ])

      const now = new Date()
      const roster = sortByAttention(day.athletes.map((a) => toAthlete(a, now)))
      return {
        team: toTeamInfo(team),
        coach: toCoachInfo(me.user, membership),
        roster,
        audit: activity.map((entry) => toAuditEntry(entry, now)),
        pastAlerts: pastAlerts.map(toPastAlert),
        actions: actionsFromDay(day.athletes),
        teamLoadChangePct: teamLoadChange(roster),
      }
    },

    async recordAction(athlete, action, notes) {
      const saved = await api.recordAction(athlete.id, {
        action: CODE_BY_ACTION[action],
        notes: notes.trim() || null,
        alertId: athlete.alertId ?? null,
      })
      return actionToAuditEntry(saved, athlete.name, new Date())
    },
  }
}

export function apiAthleteSource(): AthleteSource {
  let athleteId: string | null = null
  const signedInAthlete = () => {
    if (!athleteId) throw new Error('Sign in again to send your check-in.')
    return athleteId
  }

  return {
    async load(signal) {
      const me = await api.getMe(signal)
      if (!me.athleteId) throw new Error('This account isn’t an athlete account.')
      const membership = me.teams[0]
      if (!membership) throw new Error('Join a team with your coach’s code to start checking in.')
      athleteId = me.athleteId

      const [team, today, days] = await Promise.all([
        api.getTeam(membership.teamId, signal),
        api.getAthleteToday(me.athleteId, signal),
        api.getCheckins(me.athleteId, 7, signal),
      ])

      return {
        profile: toAthleteProfile(me.user, me.athleteId, team),
        completed: { daily: today.morningDone, post: today.workoutDone },
        lastSevenDays: today.lastSevenDays,
        coachFollowUp: today.coachFollowUp !== null,
        history: toHistoryDays(days, new Date()),
        feelingWeek: toFeelingWeek(days),
      }
    },

    async submitDaily(input) {
      await api.submitMorningCheckin(signedInAthlete(), {
        sleepQuality: input.sleep,
        fatigue: input.fatigue,
        muscleSoreness: input.soreness,
        overallWellness: input.wellness,
        symptoms: input.symptoms.map((s) => CODE_BY_SYMPTOM[s]),
      })
    },

    async submitPostTraining(input) {
      await api.submitWorkoutCheckin(signedInAthlete(), {
        rpe: input.rpe,
        durationMinutes: input.durationMinutes,
        tiredness: input.tiredness,
        muscleSoreness: input.soreness,
        preWeightKg: input.weightBeforeKg,
        postWeightKg: input.weightAfterKg,
        symptoms: input.symptoms.map((s) => CODE_BY_SYMPTOM[s]),
      })
    },
  }
}
