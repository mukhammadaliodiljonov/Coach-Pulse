import { hasFatigueAboveUsual, showsTeamPattern } from './signals'
import type { Athlete } from './types'

export interface TeamSummary {
  size: number
  checkedIn: number
  high: Athlete[]
  review: Athlete[]
  normal: Athlete[]
  /** High priority and needs review, in attention order. */
  flagged: Athlete[]
  fatigueAboveUsual: Athlete[]
  showPattern: boolean
  /** Averages over today's check-ins, rounded to one decimal; null before anyone checks in. */
  averages: { wellness: number | null; fatigue: number | null; soreness: number | null }
}

const round1 = (n: number) => Math.round(n * 10) / 10

export function summarizeTeam(roster: Athlete[]): TeamSummary {
  const average = (pick: (a: Athlete) => number | null) => {
    const values = roster.map(pick).filter((v): v is number => v !== null)
    return values.length ? round1(values.reduce((sum, v) => sum + v, 0) / values.length) : null
  }
  const fatigueAboveUsual = roster.filter(hasFatigueAboveUsual)
  return {
    size: roster.length,
    checkedIn: roster.filter((a) => a.checkedInAt).length,
    high: roster.filter((a) => a.status === 'high'),
    review: roster.filter((a) => a.status === 'review'),
    normal: roster.filter((a) => a.status === 'normal'),
    flagged: roster.filter((a) => a.status !== 'normal'),
    fatigueAboveUsual,
    showPattern: showsTeamPattern(fatigueAboveUsual.length),
    averages: {
      wellness: average((a) => a.wellness),
      fatigue: average((a) => a.fatigue),
      soreness: average((a) => a.soreness),
    },
  }
}
