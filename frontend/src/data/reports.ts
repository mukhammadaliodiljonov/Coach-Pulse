import type { Athlete, AuditEntry, CoachAction } from '../domain/types'
import { RESOLVED_ALERTS } from './activity'

// Report previews for Sep 28 – Oct 4, 2026. Weekly figures are sample data.

export type ReportKind = 'weekly' | 'load' | 'alerts' | 'checkins' | 'followup'

export const REPORT_TYPES: { kind: ReportKind; title: string; description: string }[] = [
  { kind: 'weekly', title: 'Weekly team wellness', description: 'Averages and changes vs baseline' },
  { kind: 'load', title: 'Training load summary', description: 'Sessions, load and change per athlete' },
  { kind: 'alerts', title: 'Safety alerts', description: 'Every alert raised and its outcome' },
  { kind: 'checkins', title: 'Check-in completion', description: 'Who checked in, by day' },
  { kind: 'followup', title: 'Athlete follow-up history', description: 'Recorded coach actions — audit trail' },
]

export const REPORT_PERIOD = 'Sep 28 – Oct 4, 2026'

const WEEK = ['Mon 28', 'Tue 29', 'Wed 30', 'Thu 1', 'Fri 2', 'Sat 3', 'Sun 4']

export interface ReportData {
  stats: { label: string; value: string }[]
  columns: string[]
  rows: string[][]
}

export interface ReportContext {
  roster: Athlete[]
  flagged: Athlete[]
  actions: Partial<Record<string, CoachAction>>
  audit: AuditEntry[]
}

const stat = (label: string, value: string | number) => ({ label, value: String(value) })
const signed = (n: number) => `${n > 0 ? '+' : ''}${n}%`

export function buildReport(kind: ReportKind, { roster, flagged, actions, audit }: ReportContext): ReportData {
  switch (kind) {
    case 'weekly':
      return {
        stats: [stat('Avg wellness', '3.8 / 5'), stat('Avg fatigue', '2.3 / 5'), stat('Avg soreness', '2.1 / 5'), stat('Check-ins', '91%')],
        columns: ['Day', 'Wellness', 'Fatigue', 'Soreness'],
        rows: WEEK.map((day, i) => [
          day,
          (3.9 - (i === 6 ? 0.2 : (i % 3) * 0.05)).toFixed(1),
          (2.0 + (i === 6 ? 0.3 : (i % 2) * 0.1)).toFixed(1),
          (2.0 + (i % 3) * 0.1).toFixed(1),
        ]),
      }
    case 'load':
      return {
        stats: [stat('Sessions', 4), stat('Avg load', '540 AU'), stat('Highest', '780 AU'), stat('vs baseline', '+12%')],
        columns: ['Athlete', 'Sessions', 'Last load', 'vs baseline'],
        rows: roster.slice(0, 8).map((a) => [a.name, '4', `${a.load} AU`, signed(a.loadChangePct)]),
      }
    case 'alerts': {
      const high = flagged.filter((a) => a.status === 'high').length
      const resolvedBefore = RESOLVED_ALERTS.length
      return {
        stats: [
          stat('Alerts', flagged.length + resolvedBefore),
          stat('High priority', high + RESOLVED_ALERTS.filter((r) => r.status === 'high').length),
          stat('Resolved', resolvedBefore + flagged.filter((a) => actions[a.id]).length),
          stat('Median time to action', '2h 40m'),
        ],
        columns: ['Athlete', 'Priority', 'Reason', 'Status'],
        rows: [
          ...flagged.map((a) => [
            a.name,
            a.status === 'high' ? 'High priority' : 'Needs review',
            a.reason,
            actions[a.id] ? 'Action recorded' : 'Open',
          ]),
          ...RESOLVED_ALERTS.map((r) => [
            r.name,
            r.status === 'high' ? 'High priority' : 'Needs review',
            r.reason,
            'Resolved',
          ]),
        ],
      }
    }
    case 'checkins':
      return {
        stats: [stat('Completion', '91%'), stat('Weekday', '96%'), stat('Weekend', '78%'), stat('Never missed', '17 athletes')],
        columns: ['Day', 'Completed', 'Missed', 'Rate'],
        rows: WEEK.map((day, i) => {
          const completed = i >= 5 ? 19 : 23 + (i % 2)
          return [day, `${completed} / 24`, String(24 - completed), `${Math.round((completed / 24) * 100)}%`]
        }),
      }
    case 'followup': {
      const coachActions = audit.filter((e) => e.kind === 'action')
      return {
        stats: [
          stat('Actions recorded', coachActions.length),
          stat('Athletes', new Set(coachActions.map((e) => e.athleteId)).size),
          stat('Referred', coachActions.filter((e) => e.text.startsWith('Referred to medical professional')).length),
          stat('Open alerts', flagged.filter((a) => !actions[a.id]).length),
        ],
        columns: ['When', 'Athlete / action', 'Notes', 'By'],
        rows: coachActions.map((e) => [e.time, e.text, e.notes || '—', e.who]),
      }
    }
  }
}
