import type {
  Athlete,
  AthleteCheckIn,
  RecoveryMetric,
  Signal,
  SignalKind,
  Status,
  Symptom,
} from './types'

/**
 * Prototype thresholds. Have them reviewed by a qualified sports-medicine
 * professional before launch.
 */
export const THRESHOLDS = {
  /** Points away from the personal baseline on a 1–5 scale. */
  recoveryDelta: 2,
  /** Percent above the recent training-load baseline. */
  loadIncreasePct: 15,
  /** Athletes above their usual fatigue before the team-level pattern card appears. */
  teamPatternMin: 5,
} as const

const RECOVERY_TITLES: Record<RecoveryMetric, string> = {
  Fatigue: 'Fatigue significantly above personal baseline',
  Wellness: 'Wellness below usual range',
  Soreness: 'Soreness well above usual level',
}

const NEXT_STEPS: Record<SignalKind, { full: string; short: string }> = {
  'Safety symptom': {
    full: 'Review the reported symptoms before further training and follow your organization’s health and safety protocol.',
    short: 'Review symptoms before training.',
  },
  'Recovery signal': {
    full: 'Consider modified training today and monitor recovery at the next check-in.',
    short: 'Consider modified training and monitor recovery.',
  },
  'Training signal': {
    full: 'Check the session plan and consider a lighter load next session.',
    short: 'Consider a lighter load next session.',
  },
}

const ATTENTION_RANK: Record<Status, number> = { high: 0, review: 1, normal: 2 }

/** "2" or "2.3" — baselines are averages, so they can be fractional. */
export function formatScore(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

/** True when a 1–5 metric has moved notably in the worse direction from the athlete's baseline. */
export function isDeviating(metric: RecoveryMetric, value: number, baseline: number): boolean {
  const worseBy = metric === 'Wellness' ? baseline - value : value - baseline
  return worseBy >= THRESHOLDS.recoveryDelta
}

export function isLoadElevated(loadChangePct: number): boolean {
  return loadChangePct >= THRESHOLDS.loadIncreasePct
}

/** Fatigue above the athlete's usual level at all — the input to the team-level pattern. */
export function hasFatigueAboveUsual(a: AthleteCheckIn): boolean {
  return a.fatigue !== null && a.baseline !== null && a.fatigue > a.baseline.fatigue
}

export function showsTeamPattern(athletesAboveUsual: number): boolean {
  return athletesAboveUsual >= THRESHOLDS.teamPatternMin
}

export interface Deviation {
  metric: RecoveryMetric
  value: number
  usual: number
}

// Signal builders, shared by the local engine and by reasons that come from the server,
// so both read the same.

export function safetySignal(symptoms: readonly Symptom[], note: string): Signal {
  const list = symptoms.join(' + ')
  return {
    level: 'high',
    kind: 'Safety symptom',
    title: `Reported ${list.toLowerCase()}`,
    detail: note || 'Reported in today’s check-in',
    note: `${note ? `${note}. ` : ''}Symptoms are self-reported by the athlete.`,
    chip: list,
    compare: [],
  }
}

/** One signal for all recovery deviations, titled by the first (fatigue, then wellness, then soreness). */
export function recoverySignal(deviations: readonly Deviation[], firstName: string): Signal {
  const describe = (d: Deviation) => `${d.metric} ${d.value}/5 vs usual ${formatScore(d.usual)}/5`
  return {
    level: 'review',
    kind: 'Recovery signal',
    title: RECOVERY_TITLES[deviations[0].metric],
    detail: deviations.map(describe).join(' · '),
    note: `Recovery is below ${firstName}’s usual range.`,
    chip: describe(deviations[0]),
    compare: deviations.map((d) => ({
      metric: d.metric,
      current: `${d.value}/5`,
      baseline: `${formatScore(d.usual)}/5`,
      baselineLabel: 'Personal baseline',
    })),
  }
}

export function trainingSignal(
  load: number,
  range: { low: number; high: number },
  changePct: number,
  lastSession: string | null,
): Signal {
  const usual = `${range.low}–${range.high}`
  return {
    level: 'review',
    kind: 'Training signal',
    title: 'Training load increased vs recent baseline',
    detail: `${load} AU vs usual ${usual} AU (+${changePct}%)`,
    note: lastSession ? `Latest session: ${lastSession}.` : 'Based on the latest post-training check-in.',
    chip: `Load +${changePct}% vs baseline`,
    compare: [{ metric: 'Load', current: `${load} AU`, baseline: usual, baselineLabel: 'Recent baseline' }],
  }
}

const RECOVERY_ORDER: RecoveryMetric[] = ['Fatigue', 'Wellness', 'Soreness']

/** Sorts deviations into title order. */
export function orderDeviations(deviations: Deviation[]): Deviation[] {
  return [...deviations].sort((x, y) => RECOVERY_ORDER.indexOf(x.metric) - RECOVERY_ORDER.indexOf(y.metric))
}

export function detectSignals(a: AthleteCheckIn): Signal[] {
  const signals: Signal[] = []

  if (a.symptoms.length > 0) signals.push(safetySignal(a.symptoms, a.symptomNote))

  // Until a personal baseline exists, only safety symptoms flag.
  const baseline = a.baseline
  if (!baseline) return signals

  const today: Record<RecoveryMetric, [number | null, number]> = {
    Fatigue: [a.fatigue, baseline.fatigue],
    Wellness: [a.wellness, baseline.wellness],
    Soreness: [a.soreness, baseline.soreness],
  }
  const deviations = RECOVERY_ORDER.flatMap((metric) => {
    const [value, usual] = today[metric]
    return value !== null && isDeviating(metric, value, usual) ? [{ metric, value, usual }] : []
  })
  if (deviations.length > 0) signals.push(recoverySignal(deviations, firstNameOf(a.name)))

  if (a.load !== null && a.loadRange && a.loadChangePct !== null && isLoadElevated(a.loadChangePct)) {
    signals.push(trainingSignal(a.load, a.loadRange, a.loadChangePct, a.lastSession))
  }

  return signals
}

export function statusFor(signals: Signal[]): Status {
  if (signals.some((s) => s.level === 'high')) return 'high'
  return signals.length > 0 ? 'review' : 'normal'
}

function quietReason(a: AthleteCheckIn, status: Status): string {
  if (status !== 'normal') return 'Flagged for review'
  if (!a.checkedInAt) return 'No check-in yet today'
  if (!a.baseline) return 'Baseline still forming'
  return 'Within usual range'
}

/**
 * Adds names, signals and status. Pass `assessed` to use an assessment made elsewhere
 * (the server's engine) instead of evaluating the check-in here.
 */
export function evaluateAthlete(a: AthleteCheckIn, assessed?: { signals: Signal[]; status: Status }): Athlete {
  const signals = assessed ? assessed.signals : detectSignals(a)
  const status = assessed ? assessed.status : statusFor(signals)
  const top = signals[0]
  const flaggedWithoutReason = !top && status !== 'normal'
  return {
    ...a,
    firstName: firstNameOf(a.name),
    initials: a.name
      .split(' ')
      .map((part) => part[0])
      .join(''),
    signals,
    status,
    reason: top ? top.title : quietReason(a, status),
    nextStep: top
      ? NEXT_STEPS[top.kind].full
      : flaggedWithoutReason
        ? 'Review the latest check-in with the athlete.'
        : 'No action needed.',
    nextStepShort: top ? NEXT_STEPS[top.kind].short : flaggedWithoutReason ? 'Review the latest check-in.' : '',
  }
}

/** High priority first, then needs review, then normal; stable within each group. */
export function sortByAttention(athletes: Athlete[]): Athlete[] {
  return [...athletes].sort((x, y) => ATTENTION_RANK[x.status] - ATTENTION_RANK[y.status])
}

function firstNameOf(name: string): string {
  return name.split(' ')[0]
}
