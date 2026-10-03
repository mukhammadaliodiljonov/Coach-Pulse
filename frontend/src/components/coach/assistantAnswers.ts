import { TEAM_BASELINE } from '../../data/team'
import type { TeamSummary } from '../../domain/team'
import { STATUS_LABELS, type Athlete, type Status } from '../../domain/types'
import { paths } from '../../navigation/paths'

// Canned answers for the prototype Assistant, computed from today's signal data.
// Production should answer from the same data (e.g. an LLM with tool calls over the API),
// and must never generate diagnoses or clear athletes to play.

export type QuestionId = 'attention' | 'whyFlagged' | 'fatigue' | 'week' | 'summary'

export interface AnswerRow {
  status: Status
  title: string
  detail: string
  athleteId: string
}

export interface Answer {
  title: string
  intro?: string
  rows: AnswerRow[]
  bullets: string[]
  cta?: { label: string; to: string }
}

export interface Question {
  id: QuestionId
  text: string
}

export function suggestedQuestions(team: TeamSummary): Question[] {
  const top = team.flagged[0]
  return [
    { id: 'attention', text: 'Who needs attention today?' },
    ...(top ? [{ id: 'whyFlagged' as const, text: `Why is ${top.firstName} flagged?` }] : []),
    { id: 'fatigue', text: 'Show athletes with elevated fatigue' },
    { id: 'week', text: 'What changed compared with last week?' },
    { id: 'summary', text: 'Summarize today’s team health' },
  ]
}

/** Routes a typed question to one of the canned answers. */
export function matchQuestion(text: string, team: TeamSummary): QuestionId | null {
  const q = text.toLowerCase()
  const top = team.flagged[0]
  if (top && (q.includes(top.firstName.toLowerCase()) || q.includes('why'))) return 'whyFlagged'
  if (q.includes('fatigue') || q.includes('tired')) return 'fatigue'
  if (q.includes('week') || q.includes('changed')) return 'week'
  if (q.includes('summar') || q.includes('health') || q.includes('overall')) return 'summary'
  if (q.includes('attention') || q.includes('who') || q.includes('flag') || q.includes('alert')) return 'attention'
  return null
}

const athleteRow = (a: Athlete, detail = a.reason): AnswerRow => ({
  status: a.status,
  title: a.name,
  detail,
  athleteId: a.id,
})

export function answerFor(id: QuestionId, team: TeamSummary): Answer {
  switch (id) {
    case 'attention':
      return team.flagged.length
        ? {
            title: 'Today’s attention',
            intro: `${team.flagged.length} athletes need review — ${team.high.length} high priority.`,
            rows: team.flagged.map((a) => athleteRow(a)),
            bullets: [],
            cta: { label: 'View all', to: paths.alerts },
          }
        : {
            title: 'Today’s attention',
            intro: 'Nobody needs review right now — everyone is within their usual range.',
            rows: [],
            bullets: [],
          }
    case 'whyFlagged': {
      const a = team.flagged[0]
      if (!a) return { title: 'Nobody is flagged', intro: 'Everyone is within their usual range today.', rows: [], bullets: [] }
      return {
        title: `${a.name} · ${STATUS_LABELS[a.status]}`,
        intro: 'Flagged because:',
        rows: a.signals.map((s) => ({ status: s.level, title: s.kind, detail: `${s.title} — ${s.detail}`, athleteId: a.id })),
        bullets: [],
        cta: { label: 'Open profile', to: paths.athlete(a.id) },
      }
    }
    case 'fatigue': {
      const n = team.fatigueAboveUsual.length
      return {
        title: `${n} athletes above their usual fatigue`,
        intro: team.showPattern
          ? 'A team-level pattern — consider the overall session plan.'
          : n
            ? 'Not a team-level pattern — check in with them individually.'
            : 'Nobody reported fatigue above their usual level today.',
        rows: team.fatigueAboveUsual.map((a) => athleteRow(a, `Fatigue ${a.fatigue}/5 vs usual ${a.baseline.fatigue}/5`)),
        bullets: [],
        cta: n ? { label: 'View in Athletes', to: paths.athletes('fatigue') } : undefined,
      }
    }
    case 'week':
      return {
        title: 'Compared with last week',
        rows: [],
        bullets: [
          'Average fatigue increased 14%.',
          'Training load is 12% above the recent baseline.',
          'Check-in completion is steady at 92%.',
          '2 athletes reported safety symptoms (0 last week).',
        ],
      }
    case 'summary':
      return {
        title: 'Today’s team health',
        rows: [],
        bullets: [
          `${team.checkedIn} of ${team.size} athletes checked in.`,
          `${team.normal.length} within their usual range, ${team.review.length} need review, ${team.high.length} high priority.`,
          ...(team.showPattern
            ? [`Fatigue is elevated across ${team.fatigueAboveUsual.length} athletes — likely a shared cause.`]
            : []),
          `Average wellness ${team.averages.wellness.toFixed(1)} / 5 (usual ${TEAM_BASELINE.wellness}).`,
        ],
        cta: { label: 'Open overview', to: paths.overview },
      }
  }
}

export const FALLBACK_ANSWER: Answer = {
  title: 'I can’t answer that yet',
  intro: 'Try one of the suggested questions. Answers come from today’s check-ins and recorded actions.',
  rows: [],
  bullets: [],
}
