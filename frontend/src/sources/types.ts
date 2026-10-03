import type { Athlete, AuditEntry, CoachAction, CoachInfo, PastAlert, Symptom, TeamInfo } from '../domain/types'

export type DataSourceKind = 'mock' | 'api'

/** Everything the coach app shows, loaded together. */
export interface CoachSnapshot {
  team: TeamInfo
  coach: CoachInfo
  /** Evaluated and sorted by attention. */
  roster: Athlete[]
  /** Newest first. */
  audit: AuditEntry[]
  pastAlerts: PastAlert[]
  /** The action recorded today, per athlete id. */
  actions: Partial<Record<string, CoachAction>>
  /** The latest team session's load vs the recent baseline, in percent. */
  teamLoadChangePct: number | null
}

export interface CoachSource {
  load(signal?: AbortSignal): Promise<CoachSnapshot>
  /** Saves an action to the athlete's append-only history and returns its audit entry. */
  recordAction(athlete: Athlete, action: CoachAction, notes: string): Promise<AuditEntry>
  /** Demo only: start in the offline state. */
  readonly startsOffline?: boolean
}

export interface AthleteProfile {
  athleteId: string
  name: string
  firstName: string
  initials: string
  position: string | null
  teamName: string
  /** How the athlete knows the coach, e.g. "Coach Rivera". */
  coachName: string
  coachInitials: string
  /** e.g. "Coach Sam Rivera and assistant coach Priya Shah" */
  visibleTo: string
}

/** One day of the athlete's own check-ins. */
export interface HistoryDay {
  /** "Today" or e.g. "Sun 4". */
  label: string
  /** Sleep, tiredness, soreness and overall feeling (1–5), or null without a daily check-in. */
  values: [number, number, number, number] | null
  session?: string
}

export interface AthleteSnapshot {
  profile: AthleteProfile
  completed: { daily: boolean; post: boolean }
  /** Oldest first; the last is today. */
  lastSevenDays: boolean[]
  /** The coach wants a word, e.g. after reported symptoms. */
  coachFollowUp: boolean
  /** Newest first. */
  history: HistoryDay[]
  /** Overall feeling for each of the last 7 days, oldest first. */
  feelingWeek: { day: string; value: number | null }[]
}

export interface DailyCheckInInput {
  sleep: number
  fatigue: number
  soreness: number
  wellness: number
  symptoms: Symptom[]
}

export interface PostTrainingInput {
  rpe: number
  tiredness: number
  soreness: number
  durationMinutes: number
  weightBeforeKg: number | null
  weightAfterKg: number | null
  symptoms: Symptom[]
}

export interface AthleteSource {
  load(signal?: AbortSignal): Promise<AthleteSnapshot>
  submitDaily(input: DailyCheckInInput): Promise<void>
  submitPostTraining(input: PostTrainingInput): Promise<void>
}
