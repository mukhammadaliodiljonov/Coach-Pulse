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
  /** Team averages for today, rounded to one decimal like the UI shows them. */
  averages: { wellness: number; fatigue: number; soreness: number }
}

const round1 = (n: number) => Math.round(n * 10) / 10

export function summarizeTeam(roster: Athlete[]): TeamSummary {
  const average = (pick: (a: Athlete) => number) =>
    roster.length ? round1(roster.reduce((sum, a) => sum + pick(a), 0) / roster.length) : 0
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
