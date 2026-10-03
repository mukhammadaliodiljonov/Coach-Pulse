import type { Athlete, Status } from '../domain/types'

// Fictional recent sessions from the design handoff.

export interface TrainingSession {
  id: string
  chip: string
  date: string
  type: string
  /** Fixed for past sessions; the latest session uses today's check-ins. */
  checkedIn?: string
  /** Past sessions share one plan; the latest uses each athlete's own post-training check-in. */
  plan?: { durationMin: number; rpe: number }
  /** Athletes flagged after a past session, with the reason. */
  flags?: Record<string, string>
}

export const SESSIONS: TrainingSession[] = [
  { id: 's1', chip: 'Sun 4 · Match', date: 'Sunday, October 4', type: 'Match' },
  {
    id: 's2',
    chip: 'Fri 2 · Training',
    date: 'Friday, October 2',
    type: 'Technical training',
    checkedIn: '24 / 24',
    plan: { durationMin: 60, rpe: 5 },
    flags: { noah: 'Load above usual range' },
  },
  {
    id: 's3',
    chip: 'Wed 30 · Training',
    date: 'Wednesday, September 30',
    type: 'Conditioning',
    checkedIn: '23 / 24',
    plan: { durationMin: 75, rpe: 7 },
    flags: {
      olivia: 'Soreness above usual after session',
      emma: 'Fatigue above usual after session',
    },
  },
]

export interface SessionRow {
  athlete: Athlete
  status: Status
  reason: string
  durationMin: number
  rpe: number
  /** Duration × RPE, in AU. */
  load: number
}

const RANK: Record<Status, number> = { high: 0, review: 1, normal: 2 }

function parseSession(session: string): { durationMin: number; rpe: number } {
  const match = /(\d+) min × RPE (\d+)/.exec(session)
  return match ? { durationMin: Number(match[1]), rpe: Number(match[2]) } : { durationMin: 70, rpe: 7 }
}

export function sessionRows(session: TrainingSession, roster: Athlete[]): SessionRow[] {
  const { plan, flags = {} } = session
  const athletes = plan ? roster : roster.filter((a) => a.checkedInAt && a.lastSession)
  return athletes
    .map((athlete, i): SessionRow => {
      if (!plan) {
        const { durationMin, rpe } = parseSession(athlete.lastSession ?? '')
        return { athlete, status: athlete.status, reason: athlete.reason, durationMin, rpe, load: durationMin * rpe }
      }
      const rpe = Math.max(3, Math.min(10, plan.rpe + ((i % 3) - 1)))
      const flag = flags[athlete.id]
      return {
        athlete,
        status: flag ? 'review' : 'normal',
        reason: flag ?? 'Within usual range',
        durationMin: plan.durationMin,
        rpe,
        load: plan.durationMin * rpe,
      }
    })
    .sort((x, y) => RANK[x.status] - RANK[y.status])
}
