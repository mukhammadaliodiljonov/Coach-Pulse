import type { Scenario } from './roster'
import { TEAM_BASELINE } from './team'

// Sample team history for the dashboard trend and the Team Trends screen.

export type WeekMetric = 'wellness' | 'fatigue' | 'load'

export interface WeekTrend {
  label: string
  min: number
  max: number
  ticks: number[]
  baseline: number
  decimals: number
  points: { label: string; value: number }[]
  insight: string
}

const DAYS_TO_TODAY = ['Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Today']

/**
 * The dashboard's "Team trend": the last seven days of a team average against its baseline.
 * Earlier days are sample data until the trends endpoint exists; today comes from the roster.
 */
export function weekTrend(metric: WeekMetric, today: { wellness: number | null; fatigue: number | null }): WeekTrend {
  if (metric === 'load') {
    return {
      label: 'Training load',
      min: 0,
      max: 800,
      ticks: [800, 600, 400, 200, 0],
      baseline: TEAM_BASELINE.load,
      decimals: 0,
      points: [490, 545, 430, 575, 520, 480, 610].map((value, i) => ({
        label: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
        value,
      })),
      insight: 'Sunday’s session averaged 610 AU — 12% above the recent baseline.',
    }
  }
  const scale = { min: 1, max: 5, ticks: [5, 4, 3, 2, 1], decimals: 1 }
  const week = (history: number[], value: number | null) =>
    [...history, ...(value === null ? [] : [value])].map((v, i) => ({ label: DAYS_TO_TODAY[i], value: v }))
  const waiting = 'No check-ins yet today.'
  if (metric === 'wellness') {
    const base = TEAM_BASELINE.wellness
    const w = today.wellness
    return {
      label: 'Wellness',
      ...scale,
      baseline: base,
      points: week([3.9, 4.0, 3.9, 3.9, 3.8, 3.9], w),
      insight:
        w === null
          ? waiting
          : w < base
            ? `Team wellness is ${w.toFixed(1)} today, slightly below the usual ${base}.`
            : `Team wellness is ${w.toFixed(1)} today, in line with the usual ${base}.`,
    }
  }
  const base = TEAM_BASELINE.fatigue
  const history = [2.1, 2.0, 2.2, 2.1, 2.0, 2.2]
  const f = today.fatigue
  return {
    label: 'Fatigue',
    ...scale,
    baseline: base,
    points: week(history, f),
    insight:
      f === null
        ? waiting
        : f > Math.max(...history)
          ? `Team fatigue is ${f.toFixed(1)} today vs a usual ${base} — the highest this week.`
          : f > base
            ? `Team fatigue is ${f.toFixed(1)} today vs a usual ${base}.`
            : `Team fatigue is ${f.toFixed(1)} today, in line with the usual ${base}.`,
  }
}

/** Latest team session load vs the recent baseline, in percent. */
export function latestLoadChange(scenario: Scenario): number {
  return scenario === 'allGreen' ? 3 : 12
}

export type TrendRange = 7 | 14 | 30
export const TREND_RANGES: readonly TrendRange[] = [7, 14, 30]

export interface TrendMetric {
  label: string
  values: number[]
  baseline: number
  min: number
  max: number
  unit: ' / 5' | ' AU' | '%'
  /** True when a higher value is the worse direction. */
  worseWhenHigher: boolean
  /** How far from the baseline counts as a notable change. */
  tolerance: number
}

/** Today's team averages; null before anyone checks in (the baseline stands in). */
export interface TrendToday {
  wellness: number | null
  fatigue: number | null
  soreness: number | null
  checkInPct: number
}

/** Day i of a range that ends on the demo day (Monday, October 5, 2026). */
export function trendDay(range: TrendRange, i: number): Date {
  return new Date(2026, 9, 5 - (range - 1 - i))
}

function series(range: TrendRange, base: number, amplitude: number, last: number, seed: number, decimals: number) {
  return Array.from({ length: range }, (_, i) =>
    i === range - 1
      ? last
      : Number(
          (base + Math.sin(i * 0.9 + seed) * amplitude + Math.cos(i * 0.37 + seed) * amplitude * 0.5).toFixed(
            decimals,
          ),
        ),
  )
}

export function buildTrendMetrics(range: TrendRange, today: TrendToday): TrendMetric[] {
  const completion = Array.from({ length: range }, (_, i) => {
    if (i === range - 1) return today.checkInPct
    const weekday = trendDay(range, i).getDay()
    return weekday === 0 || weekday === 6 ? 76 + (i % 3) * 3 : 92 + (i % 4) * 2
  })
  return [
    {
      label: 'Wellness',
      values: series(range, TEAM_BASELINE.wellness, 0.12, today.wellness ?? TEAM_BASELINE.wellness, 1, 1),
      baseline: TEAM_BASELINE.wellness,
      min: 1,
      max: 5,
      unit: ' / 5',
      worseWhenHigher: false,
      tolerance: 0.2,
    },
    {
      label: 'Fatigue',
      values: series(range, TEAM_BASELINE.fatigue, 0.12, today.fatigue ?? TEAM_BASELINE.fatigue, 2, 1),
      baseline: TEAM_BASELINE.fatigue,
      min: 1,
      max: 5,
      unit: ' / 5',
      worseWhenHigher: true,
      tolerance: 0.2,
    },
    {
      label: 'Soreness',
      values: series(range, TEAM_BASELINE.soreness, 0.1, today.soreness ?? TEAM_BASELINE.soreness, 3, 1),
      baseline: TEAM_BASELINE.soreness,
      min: 1,
      max: 5,
      unit: ' / 5',
      worseWhenHigher: true,
      tolerance: 0.2,
    },
    {
      label: 'Training load',
      values: series(range, TEAM_BASELINE.load, 55, 610, 4, 0),
      baseline: TEAM_BASELINE.load,
      min: 0,
      max: 800,
      unit: ' AU',
      worseWhenHigher: true,
      tolerance: 40,
    },
    {
      label: 'Check-in completion',
      values: completion,
      baseline: 92,
      min: 50,
      max: 100,
      unit: '%',
      worseWhenHigher: false,
      tolerance: 5,
    },
  ]
}

export type InsightTag = 'Change over time' | 'Participation' | 'Team pattern'

export function trendInsights(range: TrendRange, fatigueAboveUsual: number): { tag: InsightTag; text: string }[] {
  if (range === 14) {
    return [
      { tag: 'Change over time', text: 'Average fatigue increased 9% over the last 14 days.' },
      { tag: 'Participation', text: 'Check-in completion dropped on both weekends.' },
      { tag: 'Change over time', text: 'Training load has been above baseline for 5 of the last 6 sessions.' },
    ]
  }
  if (range === 30) {
    return [
      { tag: 'Change over time', text: 'Wellness has been steady this month, dipping only in the last 3 days.' },
      { tag: 'Participation', text: 'Weekend check-ins are consistently 15–20% lower.' },
      { tag: 'Change over time', text: 'Training load rose gradually across the month (+12%).' },
    ]
  }
  return [
    { tag: 'Change over time', text: 'Average fatigue increased 14% this week.' },
    { tag: 'Participation', text: 'Check-in completion dropped on weekends.' },
    { tag: 'Team pattern', text: `${fatigueAboveUsual} athletes are showing elevated fatigue today.` },
  ]
}
