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

/**
 * One athlete's check-in for today, alongside their personal baseline
 * (rolling ~21 days of their own check-ins) and recent training load.
 */
export interface AthleteCheckIn {
  id: string
  name: string
  position: string
  age: number
  /** 1–5. Higher is better. */
  wellness: number
  /** 1–5. Higher is worse. */
  fatigue: number
  /** 1–5. Higher is worse. */
  soreness: number
  sleep: string
  baseline: {
    wellness: number
    fatigue: number
    soreness: number
    sleep: string
  }
  /** Latest session load in arbitrary units: duration (min) × RPE. */
  load: number
  /** The athlete's usual load range, in AU. */
  loadRange: { low: number; high: number }
  /** Latest session load compared with the recent baseline, in percent. */
  loadChangePct: number
  /** Daily load over the last 14 days, oldest first; the last value is the latest session. */
  loadHistory: number[]
  /** Safety-check symptoms reported today. */
  symptoms: Symptom[]
  /** When/where the symptoms were reported, e.g. "Reported after yesterday’s training". */
  symptomNote: string
  /** Today's check-in time, or null while the check-in is pending. */
  checkedInAt: string | null
  /** When the alert was raised, if later than the check-in. */
  alertRaisedAt?: string
  /** Latest session, e.g. "78 min × RPE 10". */
  lastSession: string
  /** False during the first 7–14 days, before a personal baseline exists. */
  hasBaseline: boolean
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
  /** Title of the top signal, or "Within usual range". */
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
