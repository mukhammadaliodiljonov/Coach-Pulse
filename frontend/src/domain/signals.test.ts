import { describe, expect, it } from 'vitest'
import { buildRoster } from '../data/roster'
import {
  detectSignals,
  evaluateAthlete,
  isDeviating,
  showsTeamPattern,
  sortByAttention,
  statusFor,
} from './signals'
import { summarizeTeam } from './team'
import type { AthleteCheckIn } from './types'

const base: AthleteCheckIn = {
  id: 'test',
  name: 'Sam Example',
  position: 'Forward',
  age: 16,
  wellness: 4,
  fatigue: 2,
  soreness: 2,
  sleep: '8h 00m',
  baseline: { wellness: 4, fatigue: 2, soreness: 2, sleep: '8h 00m' },
  load: 550,
  loadRange: { low: 500, high: 600 },
  loadChangePct: 0,
  loadHistory: [],
  symptoms: [],
  symptomNote: '',
  checkedInAt: '8:00 AM',
  lastSession: '70 min × RPE 8',
  hasBaseline: true,
}

const athlete = (overrides: Partial<AthleteCheckIn>): AthleteCheckIn => ({ ...base, ...overrides })

describe('detectSignals', () => {
  it('flags nothing when everything is within the usual range', () => {
    expect(detectSignals(base)).toEqual([])
  })

  it('raises a safety signal for any reported symptom', () => {
    const [signal] = detectSignals(
      athlete({ symptoms: ['Headache', 'Dizziness'], symptomNote: 'Reported after training' }),
    )
    expect(signal).toMatchObject({
      level: 'high',
      kind: 'Safety symptom',
      title: 'Reported headache + dizziness',
      detail: 'Reported after training',
      chip: 'Headache + Dizziness',
      note: 'Reported after training. Symptoms are self-reported by the athlete.',
    })
  })

  it('falls back to a generic detail when there is no symptom note', () => {
    const [signal] = detectSignals(athlete({ symptoms: ['Nausea'] }))
    expect(signal.detail).toBe('Reported in today’s check-in')
    expect(signal.note).toBe('Symptoms are self-reported by the athlete.')
  })

  it('needs a 2-point move from the personal baseline for a recovery signal', () => {
    expect(detectSignals(athlete({ fatigue: 3 }))).toEqual([])
    const [signal] = detectSignals(athlete({ fatigue: 4 }))
    expect(signal).toMatchObject({
      level: 'review',
      kind: 'Recovery signal',
      title: 'Fatigue significantly above personal baseline',
      chip: 'Fatigue 4/5 vs usual 2/5',
    })
  })

  it('treats lower wellness and higher soreness as worse', () => {
    expect(detectSignals(athlete({ wellness: 2 }))[0].title).toBe('Wellness below usual range')
    expect(detectSignals(athlete({ soreness: 4 }))[0].title).toBe('Soreness well above usual level')
    expect(detectSignals(athlete({ wellness: 5, fatigue: 1, soreness: 1 }))).toEqual([])
  })

  it('combines recovery deviations into one signal titled by the first metric', () => {
    const signals = detectSignals(athlete({ fatigue: 5, wellness: 2, soreness: 4 }))
    expect(signals).toHaveLength(1)
    expect(signals[0].title).toBe('Fatigue significantly above personal baseline')
    expect(signals[0].detail).toBe(
      'Fatigue 5/5 vs usual 2/5 · Wellness 2/5 vs usual 4/5 · Soreness 4/5 vs usual 2/5',
    )
    expect(signals[0].compare.map((c) => c.metric)).toEqual(['Fatigue', 'Wellness', 'Soreness'])
  })

  it('raises a training signal at 15% above the recent load baseline', () => {
    expect(detectSignals(athlete({ loadChangePct: 14 }))).toEqual([])
    const [signal] = detectSignals(athlete({ load: 690, loadChangePct: 15 }))
    expect(signal).toMatchObject({
      kind: 'Training signal',
      detail: '690 AU vs usual 500–600 AU (+15%)',
      chip: 'Load +15% vs baseline',
    })
  })

  it('only flags safety symptoms until a baseline exists', () => {
    const early = athlete({ hasBaseline: false, fatigue: 5, loadChangePct: 40 })
    expect(detectSignals(early)).toEqual([])
    expect(detectSignals({ ...early, symptoms: ['Confusion'] }).map((s) => s.kind)).toEqual([
      'Safety symptom',
    ])
  })
})

describe('status and next steps', () => {
  it('is high priority whenever a symptom is reported', () => {
    expect(statusFor(detectSignals(athlete({ symptoms: ['Headache'], fatigue: 5 })))).toBe('high')
    expect(statusFor(detectSignals(athlete({ loadChangePct: 20 })))).toBe('review')
    expect(statusFor([])).toBe('normal')
  })

  it('suggests the next step for the top signal', () => {
    expect(evaluateAthlete(athlete({ symptoms: ['Headache'] })).nextStepShort).toBe(
      'Review symptoms before training.',
    )
    expect(evaluateAthlete(athlete({ soreness: 5 })).nextStepShort).toBe(
      'Consider modified training and monitor recovery.',
    )
    expect(evaluateAthlete(athlete({ loadChangePct: 30 })).nextStepShort).toBe(
      'Consider a lighter load next session.',
    )
    expect(evaluateAthlete(base)).toMatchObject({ reason: 'Within usual range', nextStepShort: '' })
  })

  it('derives first name and initials', () => {
    expect(evaluateAthlete(base)).toMatchObject({ firstName: 'Sam', initials: 'SE' })
  })
})

describe('helpers', () => {
  it('measures deviation in the worse direction only', () => {
    expect(isDeviating('Fatigue', 4, 2)).toBe(true)
    expect(isDeviating('Fatigue', 1, 3)).toBe(false)
    expect(isDeviating('Wellness', 2, 4)).toBe(true)
    expect(isDeviating('Wellness', 5, 3)).toBe(false)
  })

  it('shows the team pattern from five athletes', () => {
    expect(showsTeamPattern(4)).toBe(false)
    expect(showsTeamPattern(5)).toBe(true)
  })

  it('sorts by attention level and keeps roster order within a level', () => {
    const roster = [
      evaluateAthlete(athlete({ id: 'a' })),
      evaluateAthlete(athlete({ id: 'b', loadChangePct: 20 })),
      evaluateAthlete(athlete({ id: 'c', symptoms: ['Nausea'] })),
      evaluateAthlete(athlete({ id: 'd', fatigue: 4 })),
    ]
    expect(sortByAttention(roster).map((a) => a.id)).toEqual(['c', 'b', 'd', 'a'])
  })
})

describe('demo roster', () => {
  const summarize = (scenario: Parameters<typeof buildRoster>[0]) =>
    summarizeTeam(sortByAttention(buildRoster(scenario).map(evaluateAthlete)))

  it('matches the numbers shown in the design', () => {
    const team = summarize('typical')
    expect(team.size).toBe(24)
    expect(team.checkedIn).toBe(22)
    expect([team.normal.length, team.review.length, team.high.length]).toEqual([18, 4, 2])
    expect(team.high.map((a) => a.id)).toEqual(['alex', 'ethan'])
    expect(team.fatigueAboveUsual).toHaveLength(8)
    expect(team.showPattern).toBe(true)
    expect(team.averages).toEqual({ wellness: 3.5, fatigue: 2.5, soreness: 2.3 })
  })

  it('flags Alex for three reasons', () => {
    const alex = evaluateAthlete(buildRoster('typical')[0])
    expect(alex.signals.map((s) => s.kind)).toEqual([
      'Safety symptom',
      'Recovery signal',
      'Training signal',
    ])
    expect(alex.reason).toBe('Reported headache + dizziness')
  })

  it('has nobody flagged in the all-green scenario', () => {
    const team = summarize('allGreen')
    expect(team.flagged).toHaveLength(0)
    expect(team.showPattern).toBe(false)
  })
})
