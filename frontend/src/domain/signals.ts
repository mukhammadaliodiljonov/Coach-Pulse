import type {
  Athlete,
  AthleteCheckIn,
  RecoveryMetric,
  Signal,
  SignalKind,
  Status,
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
  return a.fatigue > a.baseline.fatigue
}

export function showsTeamPattern(athletesAboveUsual: number): boolean {
  return athletesAboveUsual >= THRESHOLDS.teamPatternMin
}

export function detectSignals(a: AthleteCheckIn): Signal[] {
  const signals: Signal[] = []

  if (a.symptoms.length > 0) {
    const list = a.symptoms.join(' + ')
    signals.push({
      level: 'high',
      kind: 'Safety symptom',
      title: `Reported ${list.toLowerCase()}`,
      detail: a.symptomNote || 'Reported in today’s check-in',
      note: `${a.symptomNote ? `${a.symptomNote}. ` : ''}Symptoms are self-reported by the athlete.`,
      chip: list,
      compare: [],
    })
  }

  // Until a personal baseline exists, only safety symptoms flag.
  if (!a.hasBaseline) return signals

  const recovery = (
    [
      ['Fatigue', a.fatigue, a.baseline.fatigue],
      ['Wellness', a.wellness, a.baseline.wellness],
      ['Soreness', a.soreness, a.baseline.soreness],
    ] as const
  ).filter(([metric, value, usual]) => isDeviating(metric, value, usual))

  if (recovery.length > 0) {
    const describe = ([metric, value, usual]: (typeof recovery)[number]) =>
      `${metric} ${value}/5 vs usual ${usual}/5`
    signals.push({
      level: 'review',
      kind: 'Recovery signal',
      title: RECOVERY_TITLES[recovery[0][0]],
      detail: recovery.map(describe).join(' · '),
      note: `Recovery is below ${firstNameOf(a.name)}’s usual range.`,
      chip: describe(recovery[0]),
      compare: recovery.map(([metric, value, usual]) => ({
        metric,
        current: `${value}/5`,
        baseline: `${usual}/5`,
        baselineLabel: 'Personal baseline',
      })),
    })
  }

  if (isLoadElevated(a.loadChangePct)) {
    const range = `${a.loadRange.low}–${a.loadRange.high}`
    signals.push({
      level: 'review',
      kind: 'Training signal',
      title: 'Training load increased vs recent baseline',
      detail: `${a.load} AU vs usual ${range} AU (+${a.loadChangePct}%)`,
      note: `Latest session: ${a.lastSession}.`,
      chip: `Load +${a.loadChangePct}% vs baseline`,
      compare: [
        { metric: 'Load', current: `${a.load} AU`, baseline: range, baselineLabel: 'Recent baseline' },
      ],
    })
  }

  return signals
}

export function statusFor(signals: Signal[]): Status {
  if (signals.some((s) => s.level === 'high')) return 'high'
  return signals.length > 0 ? 'review' : 'normal'
}

export function evaluateAthlete(a: AthleteCheckIn): Athlete {
  const signals = detectSignals(a)
  const top = signals[0]
  return {
    ...a,
    firstName: firstNameOf(a.name),
    initials: a.name
      .split(' ')
      .map((part) => part[0])
      .join(''),
    signals,
    status: statusFor(signals),
    reason: top ? top.title : 'Within usual range',
    nextStep: top ? NEXT_STEPS[top.kind].full : 'No action needed.',
    nextStepShort: top ? NEXT_STEPS[top.kind].short : '',
  }
}

/** High priority first, then needs review, then normal; stable within each group. */
export function sortByAttention(athletes: Athlete[]): Athlete[] {
  return [...athletes].sort((x, y) => ATTENTION_RANK[x.status] - ATTENTION_RANK[y.status])
}

function firstNameOf(name: string): string {
  return name.split(' ')[0]
}
