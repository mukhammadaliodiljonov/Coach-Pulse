import { isLoadElevated } from '../domain/signals'
import type { AthleteCheckIn, Baseline, LoadPoint } from '../domain/types'

// Fictional roster from the design handoff, ported from the prototype's build().

export type Scenario = 'typical' | 'allGreen' | 'noCheckins' | 'loading' | 'offline'
export const SCENARIOS: readonly Scenario[] = ['typical', 'allGreen', 'noCheckins', 'loading', 'offline']

/** Every sample athlete has a baseline and a recent session. */
type Seed = Omit<AthleteCheckIn, 'loadHistory' | 'baseline' | 'load' | 'loadRange' | 'loadChangePct'> & {
  baseline: Baseline
  load: number
  loadRange: { low: number; high: number }
  loadChangePct: number
}

const usual = (wellness: number, fatigue: number, soreness: number, sleep: string): Baseline => ({
  wellness,
  fatigue,
  soreness,
  sleep,
})

const DETAILED: Seed[] = [
  {
    id: 'alex',
    name: 'Alex Johnson',
    position: 'Midfielder',
    age: 16,
    wellness: 2,
    fatigue: 5,
    soreness: 4,
    sleep: '7h 10m',
    baseline: usual(4, 2, 2, '8h 05m'),
    load: 780,
    loadRange: { low: 500, high: 650 },
    loadChangePct: 18,
    symptoms: ['Headache', 'Dizziness'],
    symptomNote: 'Reported after yesterday’s training',
    checkedInAt: '8:12 AM',
    alertRaisedAt: '8:42 AM',
    lastSession: '78 min × RPE 10',
  },
  {
    id: 'ethan',
    name: 'Ethan Miller',
    position: 'Defender',
    age: 17,
    wellness: 3,
    fatigue: 3,
    soreness: 2,
    sleep: '7h 40m',
    baseline: usual(4, 2, 2, '8h 00m'),
    load: 520,
    loadRange: { low: 480, high: 600 },
    loadChangePct: 4,
    symptoms: ['Headache', 'Light sensitivity'],
    symptomNote: 'Reported in this morning’s check-in',
    checkedInAt: '7:58 AM',
    alertRaisedAt: '8:01 AM',
    lastSession: '65 min × RPE 8',
  },
  {
    id: 'emma',
    name: 'Emma Wilson',
    position: 'Forward',
    age: 16,
    wellness: 3,
    fatigue: 4,
    soreness: 3,
    sleep: '6h 30m',
    baseline: usual(4, 2, 2, '7h 50m'),
    load: 610,
    loadRange: { low: 520, high: 640 },
    loadChangePct: 8,
    symptoms: [],
    symptomNote: '',
    checkedInAt: '8:24 AM',
    lastSession: '76 min × RPE 8',
  },
  {
    id: 'noah',
    name: 'Noah Brown',
    position: 'Defender',
    age: 17,
    wellness: 4,
    fatigue: 2,
    soreness: 2,
    sleep: '8h 10m',
    baseline: usual(4, 2, 2, '8h 00m'),
    load: 735,
    loadRange: { low: 520, high: 620 },
    loadChangePct: 22,
    symptoms: [],
    symptomNote: '',
    checkedInAt: '8:30 AM',
    lastSession: '82 min × RPE 9',
  },
  {
    id: 'olivia',
    name: 'Olivia Davis',
    position: 'Midfielder',
    age: 16,
    wellness: 3,
    fatigue: 3,
    soreness: 5,
    sleep: '7h 20m',
    baseline: usual(4, 2, 2, '7h 45m'),
    load: 560,
    loadRange: { low: 500, high: 620 },
    loadChangePct: 5,
    symptoms: [],
    symptomNote: '',
    checkedInAt: '7:45 AM',
    lastSession: '70 min × RPE 8',
  },
  {
    id: 'sophia',
    name: 'Sophia Taylor',
    position: 'Forward',
    age: 15,
    wellness: 2,
    fatigue: 3,
    soreness: 3,
    sleep: '6h 05m',
    baseline: usual(4, 3, 2, '8h 15m'),
    load: 540,
    loadRange: { low: 480, high: 600 },
    loadChangePct: 3,
    symptoms: [],
    symptomNote: '',
    checkedInAt: '8:05 AM',
    lastSession: '68 min × RPE 8',
  },
]

const OTHERS: [id: string, name: string, position: string, age: number][] = [
  ['liam', 'Liam Smith', 'Goalkeeper', 17],
  ['daniel', 'Daniel Anderson', 'Midfielder', 16],
  ['mia', 'Mia Thomas', 'Defender', 16],
  ['lucas', 'Lucas Martin', 'Forward', 17],
  ['ava', 'Ava Clark', 'Midfielder', 15],
  ['jacob', 'Jacob Lewis', 'Defender', 16],
  ['isla', 'Isla Walker', 'Forward', 16],
  ['mason', 'Mason Hall', 'Midfielder', 17],
  ['chloe', 'Chloe Young', 'Defender', 15],
  ['leo', 'Leo King', 'Forward', 16],
  ['grace', 'Grace Wright', 'Midfielder', 16],
  ['ryan', 'Ryan Scott', 'Defender', 17],
  ['zoe', 'Zoe Green', 'Goalkeeper', 16],
  ['owen', 'Owen Baker', 'Midfielder', 15],
  ['ruby', 'Ruby Adams', 'Forward', 16],
  ['jack', 'Jack Nelson', 'Defender', 17],
  ['lily', 'Lily Carter', 'Midfielder', 16],
  ['harry', 'Harry Mitchell', 'Forward', 15],
]

/** Deterministic filler athletes, mostly within their usual range; two haven't checked in yet. */
function generated([id, name, position, age]: (typeof OTHERS)[number], i: number): Seed {
  const loadChangePct = ((i * 7) % 15) - 6
  const pending = i === 7 || i === 15
  return {
    id,
    name,
    position,
    age,
    wellness: pending ? null : i % 3 === 0 ? 3 : 4,
    fatigue: pending ? null : [1, 5, 9, 13].includes(i) ? 3 : 2,
    soreness: pending ? null : 2,
    sleep: pending ? null : `${7 + (i % 2)}h ${String((10 + i * 3) % 60).padStart(2, '0')}m`,
    baseline: usual(4, 2, 2, '8h 00m'),
    load: Math.round(550 * (1 + loadChangePct / 100)),
    loadRange: { low: 480, high: 620 },
    loadChangePct,
    symptoms: [],
    symptomNote: '',
    checkedInAt: pending ? null : `7:${20 + i * 2} AM`,
    lastSession: `70 min × RPE ${7 + (i % 2)}`,
  }
}

function applyScenario(a: Seed, scenario: Scenario): Seed {
  switch (scenario) {
    case 'allGreen':
      return {
        ...a,
        wellness: a.wellness === null ? null : a.baseline.wellness,
        fatigue: a.fatigue === null ? null : a.baseline.fatigue,
        soreness: a.soreness === null ? null : a.baseline.soreness,
        symptoms: [],
        loadChangePct: Math.min(a.loadChangePct, 6),
        load: Math.min(a.load, a.loadRange.high),
      }
    case 'noCheckins':
      // Nobody has checked in yet; the latest sessions are from before today.
      return {
        ...a,
        wellness: null,
        fatigue: null,
        soreness: null,
        sleep: null,
        symptoms: [],
        symptomNote: '',
        checkedInAt: null,
        alertRaisedAt: undefined,
      }
    default:
      return a
  }
}

/** A plausible 14-day load history ending with the latest session on Sunday, October 4, 2026. */
function loadHistory(a: Seed): LoadPoint[] {
  const { low, high } = a.loadRange
  const mid = (low + high) / 2
  const amplitude = (high - low) / 2
  const loads = Array.from({ length: 14 }, (_, i) =>
    i === 13 ? a.load : Math.round(mid + Math.sin(i * 1.9 + (a.age ?? 0)) * amplitude * 0.75),
  )
  if (isLoadElevated(a.loadChangePct)) {
    loads[11] = high - 10
    loads[12] = Math.round((high + a.load) / 2)
  }
  return loads.map((load, i) => ({ date: `2026-${i < 10 ? `09-${21 + i}` : `10-0${i - 9}`}`, load }))
}

export function buildRoster(scenario: Scenario): AthleteCheckIn[] {
  return [...DETAILED, ...OTHERS.map(generated)]
    .map((seed) => applyScenario(seed, scenario))
    .map((seed) => ({ ...seed, loadHistory: loadHistory(seed) }))
}
