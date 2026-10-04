import {
  evaluateAthlete,
  formatScore,
  orderDeviations,
  recoverySignal,
  safetySignal,
  trainingSignal,
} from '../domain/signals'
import type {
  Athlete,
  AthleteCheckIn,
  AuditEntry,
  CoachAction,
  CoachInfo,
  PastAlert,
  RecoveryMetric,
  Signal,
  Status,
  Symptom,
  TeamInfo,
} from '../domain/types'
import { ageOn, daysBetween, formatActivityTime, formatClock, formatDateTime, parseLocalDate } from '../lib/time'
import type { AthleteProfile, HistoryDay } from '../sources/types'
import type {
  ActivityDto,
  AlertDto,
  AthleteDayDto,
  CheckinDayDto,
  CoachActionCode,
  CoachActionDto,
  MemberRole,
  ReasonDto,
  RecoveryMetricCode,
  RiskStatus,
  SymptomCode,
  TeamCoachDto,
  TeamDto,
  TeamMembershipDto,
  UserDto,
} from './types'

// Maps API shapes onto the UI's model. Copy (titles, sentences) is built here, never by the server.

export const SYMPTOM_BY_CODE: Record<SymptomCode, Symptom> = {
  HEADACHE: 'Headache',
  DIZZINESS: 'Dizziness',
  NAUSEA: 'Nausea',
  LIGHT_SENSITIVITY: 'Light sensitivity',
  BALANCE_PROBLEMS: 'Balance problems',
  CONFUSION: 'Confusion',
}

export const CODE_BY_SYMPTOM = invert(SYMPTOM_BY_CODE)

export const ACTION_BY_CODE: Record<CoachActionCode, CoachAction> = {
  REVIEWED_WITH_ATHLETE: 'Reviewed with athlete',
  MODIFIED_TRAINING: 'Modified training',
  REMOVED_FROM_TRAINING: 'Removed from training',
  CONTACTED_GUARDIAN: 'Contacted parent/guardian',
  REFERRED_TO_MEDICAL: 'Referred to medical professional',
  OTHER: 'Other',
}

export const CODE_BY_ACTION = invert(ACTION_BY_CODE)

/** RED / YELLOW / GREEN are shown as High priority / Needs review / Normal. */
export const STATUS_BY_RISK: Record<RiskStatus, Status> = { RED: 'high', YELLOW: 'review', GREEN: 'normal' }

const METRIC_BY_CODE: Record<Exclude<RecoveryMetricCode, 'SLEEP'>, RecoveryMetric> = {
  FATIGUE: 'Fatigue',
  WELLNESS: 'Wellness',
  SORENESS: 'Soreness',
}

const ROLE_LABELS: Record<MemberRole, string> = {
  HEAD_COACH: 'Head coach',
  ASSISTANT_COACH: 'Assistant coach',
  ATHLETE: 'Athlete',
}

function invert<K extends string, V extends string>(record: Record<K, V>): Record<V, K> {
  return Object.fromEntries(Object.entries(record).map(([k, v]) => [v, k])) as Record<V, K>
}

const round1 = (n: number) => Math.round(n * 10) / 10
const unique = <T,>(items: T[]) => [...new Set(items)]
const initialsOf = (first: string, last: string) => `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

// --- Coach ----------------------------------------------------------------

export function toTeamInfo(team: TeamDto): TeamInfo {
  return { name: team.name, sport: team.sport, ageGroup: team.ageGroup, joinCode: team.joinCode }
}

export function toCoachInfo(user: UserDto, membership: TeamMembershipDto): CoachInfo {
  return {
    name: `${user.firstName} ${user.lastName}`,
    shortName: `Coach ${user.lastName}`,
    initials: initialsOf(user.firstName, user.lastName),
    role: ROLE_LABELS[membership.memberRole],
    email: user.email,
  }
}

/** Today's check-in with its context, in the UI's model (before evaluation). */
export function toCheckIn(dto: AthleteDayDto, now: Date): AthleteCheckIn {
  const morning = dto.morningCheckin
  const workout = dto.latestWorkout
  const workoutDaysAgo = workout ? daysBetween(new Date(workout.createdAt), now) : null
  // Symptoms reported after yesterday's training still matter this morning.
  const recentWorkout = workout && workoutDaysAgo !== null && workoutDaysAgo <= 1 ? workout : null
  const symptomCodes = unique([...(morning?.symptoms ?? []), ...(recentWorkout?.symptoms ?? [])])
  const symptomNote = morning?.symptoms.length
    ? 'Reported in this morning’s check-in'
    : recentWorkout?.symptoms.length
      ? `Reported after ${workoutDaysAgo === 0 ? 'today’s' : 'yesterday’s'} training`
      : ''

  const load = workout ? workout.durationMinutes * workout.rpe : null
  const usualLoad = dto.baseline?.trainingLoad ?? null
  const baseline = dto.baseline

  return {
    id: dto.athleteId,
    name: `${dto.firstName} ${dto.lastName}`,
    position: dto.position,
    age: dto.dateOfBirth ? ageOn(dto.dateOfBirth, now) : null,
    wellness: morning?.overallWellness ?? null,
    fatigue: morning?.fatigue ?? null,
    soreness: morning?.muscleSoreness ?? null,
    sleep: morning ? `${morning.sleepQuality}/5` : null,
    baseline: baseline && {
      wellness: round1(baseline.overallWellness),
      fatigue: round1(baseline.fatigue),
      soreness: round1(baseline.muscleSoreness),
      sleep: `${formatScore(round1(baseline.sleepQuality))}/5`,
    },
    load,
    loadRange: usualLoad && { low: Math.round(usualLoad.lowAu), high: Math.round(usualLoad.highAu) },
    loadChangePct:
      load !== null && usualLoad && usualLoad.meanAu > 0
        ? Math.round(((load - usualLoad.meanAu) / usualLoad.meanAu) * 100)
        : null,
    loadHistory: dto.loadHistory.map((d) => ({ date: d.date, load: d.loadAu })),
    symptoms: symptomCodes.map((code) => SYMPTOM_BY_CODE[code]),
    symptomNote,
    checkedInAt: morning ? formatClock(new Date(morning.createdAt)) : null,
    alertRaisedAt: dto.alert ? formatClock(new Date(dto.alert.createdAt)) : undefined,
    alertId: dto.alert?.id,
    lastSession: workout ? `${workout.durationMinutes} min × RPE ${workout.rpe}` : null,
  }
}

/** Rebuilds signals from the reasons the server's engine stored, worded exactly like local ones. */
export function signalsFromReasons(
  reasons: ReasonDto[],
  firstName: string,
  context: { symptomNote: string; lastSession: string | null } = { symptomNote: '', lastSession: null },
): Signal[] {
  const signals: Signal[] = []

  const safety = reasons.filter((r) => r.kind === 'SAFETY_SYMPTOM')
  if (safety.length > 0) {
    const symptoms = unique(safety.flatMap((r) => r.symptoms)).map((code) => SYMPTOM_BY_CODE[code])
    const note =
      context.symptomNote ||
      (safety[0].source === 'MORNING_CHECKIN' ? 'Reported in this morning’s check-in' : 'Reported after training')
    signals.push(safetySignal(symptoms, note))
  }

  const deviations = reasons.flatMap((r) =>
    r.kind === 'RECOVERY' && r.metric !== 'SLEEP'
      ? [{ metric: METRIC_BY_CODE[r.metric], value: r.value, usual: round1(r.baseline) }]
      : [],
  )
  if (deviations.length > 0) signals.push(recoverySignal(orderDeviations(deviations), firstName))

  const training = reasons.find((r) => r.kind === 'TRAINING_LOAD')
  if (training) {
    signals.push(
      trainingSignal(
        training.loadAu,
        { low: Math.round(training.baselineLowAu), high: Math.round(training.baselineHighAu) },
        Math.round(training.changePct),
        context.lastSession,
      ),
    )
  }
  return signals
}

/** The server's assessment wins when it exists; until its engine runs, the app evaluates locally. */
export function toAthlete(dto: AthleteDayDto, now: Date): Athlete {
  const checkIn = toCheckIn(dto, now)
  if (!dto.assessment) return evaluateAthlete(checkIn)
  return evaluateAthlete(checkIn, {
    signals: signalsFromReasons(dto.assessment.reasons, dto.firstName, checkIn),
    status: STATUS_BY_RISK[dto.assessment.riskStatus],
  })
}

/** Actions already recorded on today's alerts. */
export function actionsFromDay(athletes: AthleteDayDto[]): Partial<Record<string, CoachAction>> {
  return Object.fromEntries(
    athletes.flatMap((a) => (a.alert?.latestAction ? [[a.athleteId, ACTION_BY_CODE[a.alert.latestAction.action]]] : [])),
  )
}

/** The team's latest-session load vs baseline: the average change across athletes with both. */
export function teamLoadChange(roster: AthleteCheckIn[]): number | null {
  const changes = roster.map((a) => a.loadChangePct).filter((c): c is number => c !== null)
  return changes.length ? Math.round(changes.reduce((sum, c) => sum + c, 0) / changes.length) : null
}

function topReason(reasons: ReasonDto[], firstName: string): string | null {
  return signalsFromReasons(reasons, firstName)[0]?.title ?? null
}

export function toAuditEntry(dto: ActivityDto, now: Date): AuditEntry {
  const base = { id: dto.id, athleteId: dto.athleteId, time: formatActivityTime(new Date(dto.createdAt), now) }
  switch (dto.type) {
    case 'ALERT_RAISED': {
      const reason = topReason(dto.reasons, dto.athleteName.split(' ')[0])
      const level = dto.riskStatus === 'RED' ? 'High-priority' : 'Review'
      return {
        ...base,
        kind: 'alert',
        who: 'CoachPulse',
        text: `${level} alert raised — ${dto.athleteName}${reason ? `: ${lowerFirst(reason)}` : ''}`,
      }
    }
    case 'MORNING_CHECKIN':
      return { ...base, kind: 'checkin', who: dto.athleteName, text: `${dto.athleteName} submitted daily check-in` }
    case 'WORKOUT_CHECKIN':
      return {
        ...base,
        kind: 'checkin',
        who: dto.athleteName,
        text: `${dto.athleteName} submitted post-training check-in (${dto.durationMinutes} min, RPE ${dto.rpe})`,
      }
    case 'COACH_ACTION':
      return {
        ...base,
        kind: 'action',
        who: dto.coachName,
        text: `${ACTION_BY_CODE[dto.action]} — ${dto.athleteName}`,
        notes: dto.notes ?? undefined,
      }
  }
}

export function actionToAuditEntry(dto: CoachActionDto, athleteName: string, now: Date): AuditEntry {
  return toAuditEntry({ ...dto, type: 'COACH_ACTION', athleteName }, now)
}

export function toPastAlert(dto: AlertDto): PastAlert {
  return {
    athleteId: dto.athleteId,
    name: dto.athleteName,
    status: dto.riskStatus === 'RED' ? 'high' : 'review',
    reason: topReason(dto.reasons, dto.athleteName.split(' ')[0]) ?? 'Flagged for review',
    detected: formatDateTime(new Date(dto.createdAt)),
    action: dto.latestAction ? ACTION_BY_CODE[dto.latestAction.action] : 'Closed',
  }
}

// --- Athlete --------------------------------------------------------------

function coachPhrase(coach: TeamCoachDto): string {
  const role = coach.memberRole === 'HEAD_COACH' ? 'Coach' : 'assistant coach'
  return `${role} ${coach.firstName} ${coach.lastName}`
}

export function toAthleteProfile(user: UserDto, athleteId: string, team: TeamDto): AthleteProfile {
  const head = team.coaches.find((c) => c.memberRole === 'HEAD_COACH') ?? team.coaches[0]
  const visible = team.coaches.map(coachPhrase)
  return {
    athleteId,
    name: `${user.firstName} ${user.lastName}`,
    firstName: user.firstName,
    initials: initialsOf(user.firstName, user.lastName),
    position: null,
    teamName: team.name,
    coachName: head ? `Coach ${head.lastName}` : 'your coach',
    coachInitials: head ? initialsOf(head.firstName, head.lastName) : '',
    visibleTo: visible.length
      ? visible.length === 1
        ? visible[0]
        : `${visible.slice(0, -1).join(', ')} and ${visible[visible.length - 1]}`
      : 'Your coaching staff',
  }
}

function dayLabel(isoDate: string, now: Date): string {
  const date = parseLocalDate(isoDate)
  if (daysBetween(date, now) === 0) return 'Today'
  return `${date.toLocaleDateString('en-US', { weekday: 'short' })} ${date.getDate()}`
}

export function toHistoryDays(days: CheckinDayDto[], now: Date): HistoryDay[] {
  return days.map((d) => ({
    label: dayLabel(d.date, now),
    values: d.morning
      ? [d.morning.sleepQuality, d.morning.fatigue, d.morning.muscleSoreness, d.morning.overallWellness]
      : null,
    session: d.workout ? `Session · ${d.workout.durationMinutes} min · RPE ${d.workout.rpe}` : undefined,
  }))
}

/** Overall feeling for each of the last 7 days, oldest first. */
export function toFeelingWeek(days: CheckinDayDto[]): { day: string; value: number | null }[] {
  return [...days]
    .slice(0, 7)
    .reverse()
    .map((d) => ({
      day: parseLocalDate(d.date).toLocaleDateString('en-US', { weekday: 'narrow' }),
      value: d.morning?.overallWellness ?? null,
    }))
}
