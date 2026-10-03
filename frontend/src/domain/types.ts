export type Status = 'high' | 'review' | 'normal'
export type SignalLevel = Exclude<Status, 'normal'>

export const STATUS_LABELS: Record<Status, string> = {
  high: 'High priority',
  review: 'Needs review',
  normal: 'Normal',
}
export type SignalKind = 'Safety symptom' | 'Recovery signal' | 'Training signal'

export const SYMPTOMS = [
  'Headache',
  'Dizziness',
  'Nausea',
  'Light sensitivity',
  'Balance problems',
  'Confusion',
] as const
export type Symptom = (typeof SYMPTOMS)[number]

/** The three 1–5 check-in scales compared against a personal baseline. */
export type RecoveryMetric = 'Fatigue' | 'Wellness' | 'Soreness'

/** The athlete's own usual levels: averages over their last ~21 days of check-ins. */
export interface Baseline {
  /** 1–5 averages, so they may be fractional. */
  wellness: number
  fatigue: number
  soreness: number
  /** For display, e.g. "8h 05m" or "4/5". */
  sleep: string
}

export interface LoadPoint {
  /** ISO date, e.g. "2026-10-04". */
  date: string
  /** Duration (min) × RPE, in arbitrary units. */
  load: number
}

/**
 * One athlete's check-in for today, alongside their personal baseline and recent training load.
 * Today's values are null while the check-in is pending.
 */
export interface AthleteCheckIn {
  id: string
  name: string
  position: string | null
  age: number | null
  /** 1–5. Higher is better. */
  wellness: number | null
  /** 1–5. Higher is worse. */
  fatigue: number | null
  /** 1–5. Higher is worse. */
  soreness: number | null
  /** For display, e.g. "7h 10m" or "3/5". */
  sleep: string | null
  /** Null during the first 7–14 days; until then only safety symptoms flag. */
  baseline: Baseline | null
  /** Latest session load in AU, or null before any post-training check-in. */
  load: number | null
  /** The athlete's usual load range, in AU. */
  loadRange: { low: number; high: number } | null
  /** Latest session load compared with the recent baseline, in percent. */
  loadChangePct: number | null
  /** Daily load over the last 14 days, oldest first. */
  loadHistory: LoadPoint[]
  /** Safety-check symptoms reported today (or after yesterday's training). */
  symptoms: Symptom[]
  /** When/where the symptoms were reported, e.g. "Reported after yesterday’s training". */
  symptomNote: string
  /** Today's check-in time, or null while the check-in is pending. */
  checkedInAt: string | null
  /** When the alert was raised, if later than the check-in. */
  alertRaisedAt?: string
  /** The server's id for today's alert, when there is one. */
  alertId?: string
  /** Latest session, e.g. "78 min × RPE 10". */
  lastSession: string | null
}

export interface Comparison {
  metric: string
  current: string
  baseline: string
  baselineLabel: 'Personal baseline' | 'Recent baseline'
}

/** A plain-language reason an athlete was flagged, always relative to their own baseline. */
export interface Signal {
  level: SignalLevel
  kind: SignalKind
  title: string
  detail: string
  note: string
  /** Short form for chips, e.g. "Fatigue 5/5 vs usual 2/5". */
  chip: string
  compare: Comparison[]
}

export interface Athlete extends AthleteCheckIn {
  firstName: string
  initials: string
  signals: Signal[]
  status: Status
  /** Title of the top signal, or why there is none, e.g. "Within usual range". */
  reason: string
  nextStep: string
  nextStepShort: string
}

export type AuditKind = 'alert' | 'checkin' | 'action'

/** Append-only audit trail entry. */
export interface AuditEntry {
  id: string
  athleteId: string
  time: string
  who: string
  text: string
  notes?: string
  kind: AuditKind
}

export const COACH_ACTIONS = [
  'Reviewed with athlete',
  'Modified training',
  'Removed from training',
  'Contacted parent/guardian',
  'Referred to medical professional',
  'Other',
] as const
export type CoachAction = (typeof COACH_ACTIONS)[number]

/** An alert raised before today, with its outcome. */
export interface PastAlert {
  athleteId: string
  name: string
  status: SignalLevel
  reason: string
  detected: string
  action: string
}

export interface TeamInfo {
  name: string
  sport: string
  ageGroup: string | null
  joinCode: string | null
}

export interface CoachInfo {
  name: string
  /** How athletes see the coach, e.g. "Coach Rivera". */
  shortName: string
  initials: string
  role: string
  email: string
}
