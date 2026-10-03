// Request and response shapes of the CoachPulse REST API, as proposed in docs/api-contract.md.
// JSON is camelCase, ids are UUID strings, timestamps are ISO-8601 with an offset, dates are YYYY-MM-DD.
// There is deliberately no numeric risk score anywhere in the API.

export type Uuid = string
/** e.g. "2026-10-05T08:12:00Z" */
export type IsoDateTime = string
/** e.g. "2026-10-05" */
export type IsoDate = string

export type UserRole = 'ATHLETE' | 'COACH' | 'ADMIN'
export type MemberRole = 'HEAD_COACH' | 'ASSISTANT_COACH' | 'ATHLETE'
export type SymptomCode = 'HEADACHE' | 'DIZZINESS' | 'NAUSEA' | 'LIGHT_SENSITIVITY' | 'BALANCE_PROBLEMS' | 'CONFUSION'
export type RiskStatus = 'GREEN' | 'YELLOW' | 'RED'
export type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED'
export type RecoveryMetricCode = 'FATIGUE' | 'WELLNESS' | 'SORENESS'
export type CoachActionCode =
  | 'REVIEWED_WITH_ATHLETE'
  | 'MODIFIED_TRAINING'
  | 'REMOVED_FROM_TRAINING'
  | 'CONTACTED_GUARDIAN'
  | 'REFERRED_TO_MEDICAL'
  | 'OTHER'

/** RFC 9457 problem detail, as returned by the backend's GlobalExceptionHandler. */
export interface ProblemDetail {
  type?: string
  title?: string
  status?: number
  detail?: string
  instance?: string
  timestamp?: IsoDateTime
  /** Field → message, for validation failures. */
  errors?: Record<string, string>
}

// --- Identity -------------------------------------------------------------

export interface UserDto {
  id: Uuid
  email: string
  firstName: string
  lastName: string
  role: UserRole
}

export interface TeamMembershipDto {
  teamId: Uuid
  name: string
  sport: string
  memberRole: MemberRole
}

/** POST /api/auth/register — new accounts are coaches. */
export interface RegistrationRequest {
  email: string
  /** 8–128 characters. */
  password: string
  firstName: string
  lastName: string
}

export interface RegistrationResponse {
  id: Uuid
  email: string
  firstName: string
  lastName: string
  role: UserRole
  createdAt: IsoDateTime
}

/** POST /api/auth/login */
export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  /** A signed JWT whose claims are sub (user id), role, iat and exp. */
  accessToken: string
  tokenType: 'Bearer'
  /** Seconds. */
  expiresIn: number
}

/** GET /api/me */
export interface MeDto {
  user: UserDto
  /** athlete_profiles.id when the user is an athlete. */
  athleteId: Uuid | null
  teams: TeamMembershipDto[]
}

// --- Coach ----------------------------------------------------------------

export interface TeamCoachDto {
  userId: Uuid
  firstName: string
  lastName: string
  memberRole: Exclude<MemberRole, 'ATHLETE'>
}

/** GET /api/teams/{teamId} */
export interface TeamDto {
  id: Uuid
  name: string
  sport: string
  /** Proposed column. */
  ageGroup: string | null
  /** Proposed column: the code athletes enter to join. */
  joinCode: string | null
  coaches: TeamCoachDto[]
}

export interface MorningCheckinDto {
  id: Uuid
  createdAt: IsoDateTime
  /** All 1–5. */
  sleepQuality: number
  fatigue: number
  muscleSoreness: number
  overallWellness: number
  /** Proposed: today the table has no symptom columns. */
  symptoms: SymptomCode[]
  notes: string | null
}

export interface WorkoutCheckinDto {
  id: Uuid
  createdAt: IsoDateTime
  /** 1–10 */
  rpe: number
  durationMinutes: number
  /** Proposed: "How tired do you feel?" after training, 1–5. */
  tiredness: number | null
  /** Proposed: "Any muscle soreness?" after training, 1–5. */
  muscleSoreness: number | null
  preWeightKg: number | null
  postWeightKg: number | null
  /** From headache / dizziness / light_sensitivity today; nausea, balance problems and confusion are proposed. */
  symptoms: SymptomCode[]
}

/** The athlete's own averages over the last `windowDays` days. */
export interface BaselineDto {
  windowDays: number
  sleepQuality: number
  fatigue: number
  muscleSoreness: number
  overallWellness: number
  /** Session load (duration × RPE) over the same window; null without enough sessions. */
  trainingLoad: { meanAu: number; lowAu: number; highAu: number } | null
}

export interface DailyLoadDto {
  date: IsoDate
  /** 0 on days without a session. */
  loadAu: number
}

/** Why an assessment flagged an athlete — stored in risk_assessments.reason_codes. */
export type ReasonDto =
  | { kind: 'SAFETY_SYMPTOM'; symptoms: SymptomCode[]; source: 'MORNING_CHECKIN' | 'WORKOUT_CHECKIN' }
  | { kind: 'RECOVERY'; metric: RecoveryMetricCode; value: number; baseline: number }
  | { kind: 'TRAINING_LOAD'; loadAu: number; baselineLowAu: number; baselineHighAu: number; changePct: number }

export interface AssessmentDto {
  id: Uuid
  createdAt: IsoDateTime
  riskStatus: RiskStatus
  reasons: ReasonDto[]
  engineVersion: string
}

export interface CoachActionDto {
  id: Uuid
  athleteId: Uuid
  alertId: Uuid | null
  action: CoachActionCode
  notes: string | null
  coachName: string
  createdAt: IsoDateTime
}

export interface AlertSummaryDto {
  id: Uuid
  status: AlertStatus
  createdAt: IsoDateTime
  latestAction: CoachActionDto | null
}

/** One athlete's day, as the coach sees it. */
export interface AthleteDayDto {
  athleteId: Uuid
  firstName: string
  lastName: string
  /** Proposed column. */
  position: string | null
  dateOfBirth: IsoDate | null
  /** Today's morning check-in, once submitted. */
  morningCheckin: MorningCheckinDto | null
  /** The most recent post-training check-in, from any day. */
  latestWorkout: WorkoutCheckinDto | null
  /** Null during the first 7–14 days. */
  baseline: BaselineDto | null
  /** Last 14 days, oldest first. */
  loadHistory: DailyLoadDto[]
  /** Today's assessment by the server's signal engine, once it runs. */
  assessment: AssessmentDto | null
  /** Today's alert, if one was raised. */
  alert: AlertSummaryDto | null
}

/** GET /api/teams/{teamId}/athletes/today */
export interface TeamDayDto {
  teamId: Uuid
  date: IsoDate
  athletes: AthleteDayDto[]
}

/** GET /api/teams/{teamId}/alerts */
export interface AlertDto extends AlertSummaryDto {
  athleteId: Uuid
  athleteName: string
  riskStatus: RiskStatus
  reasons: ReasonDto[]
}

interface ActivityBase {
  id: Uuid
  createdAt: IsoDateTime
  athleteId: Uuid
  athleteName: string
}

/** GET /api/teams/{teamId}/activity — newest first. */
export type ActivityDto =
  | (ActivityBase & { type: 'ALERT_RAISED'; riskStatus: RiskStatus; reasons: ReasonDto[] })
  | (ActivityBase & { type: 'MORNING_CHECKIN' })
  | (ActivityBase & { type: 'WORKOUT_CHECKIN'; durationMinutes: number; rpe: number })
  | (ActivityBase & { type: 'COACH_ACTION'; action: CoachActionCode; notes: string | null; coachName: string })

/** POST /api/athletes/{athleteId}/actions */
export interface RecordActionRequest {
  action: CoachActionCode
  notes: string | null
  /** Today's alert, which becomes ACKNOWLEDGED. */
  alertId: Uuid | null
}

// --- Athlete --------------------------------------------------------------

/** GET /api/athletes/{athleteId}/today */
export interface AthleteTodayDto {
  morningDone: boolean
  workoutDone: boolean
  /** Whether the athlete checked in on each of the last 7 days, oldest first; the last is today. */
  lastSevenDays: boolean[]
  /** Set while the athlete has an open high-priority alert. */
  coachFollowUp: { coachName: string } | null
}

/** GET /api/athletes/{athleteId}/checkins?days=7 — newest first. */
export interface CheckinDayDto {
  date: IsoDate
  morning: MorningCheckinDto | null
  workout: WorkoutCheckinDto | null
}

/** POST /api/athletes/{athleteId}/morning-checkins */
export interface MorningCheckinRequest {
  sleepQuality: number
  fatigue: number
  muscleSoreness: number
  overallWellness: number
  /** Empty when the athlete chose "None of these". */
  symptoms: SymptomCode[]
}

/** POST /api/athletes/{athleteId}/workout-checkins */
export interface WorkoutCheckinRequest {
  rpe: number
  durationMinutes: number
  tiredness: number
  muscleSoreness: number
  preWeightKg: number | null
  postWeightKg: number | null
  symptoms: SymptomCode[]
}
