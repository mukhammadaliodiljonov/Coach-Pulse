import { alertTimeLabel } from '../domain/alerts'
import type { Athlete, AuditEntry, PastAlert, Status } from '../domain/types'
import { paths } from '../navigation/paths'
import type { Scenario } from './roster'

// Fictional audit trail from the design handoff. New coach actions are prepended at runtime.

const SEED: AuditEntry[] = [
  {
    id: 'seed-1',
    athleteId: 'alex',
    time: 'Today, 8:42 AM',
    who: 'CoachPulse',
    text: 'High-priority alert raised — reported headache + dizziness',
    kind: 'alert',
  },
  {
    id: 'seed-2',
    athleteId: 'ethan',
    time: 'Today, 8:01 AM',
    who: 'CoachPulse',
    text: 'High-priority alert raised — Ethan Miller reported headache + light sensitivity',
    kind: 'alert',
  },
  {
    id: 'seed-3',
    athleteId: 'alex',
    time: 'Today, 8:12 AM',
    who: 'Alex Johnson',
    text: 'Alex Johnson submitted daily check-in',
    kind: 'checkin',
  },
  {
    id: 'seed-4',
    athleteId: 'alex',
    time: 'Sun, 6:20 PM',
    who: 'Alex Johnson',
    text: 'Alex Johnson submitted post-training check-in (78 min, RPE 10)',
    kind: 'checkin',
  },
  {
    id: 'seed-5',
    athleteId: 'olivia',
    time: 'Sat, 5:10 PM',
    who: 'Coach Rivera',
    text: 'Modified training for Olivia Davis',
    notes: 'Reduced sprint volume, monitoring soreness.',
    kind: 'action',
  },
  {
    id: 'seed-6',
    athleteId: 'liam',
    time: 'Fri, 4:02 PM',
    who: 'Coach Rivera',
    text: 'Reviewed with athlete — Liam Smith',
    notes: 'Headache resolved, no further symptoms reported.',
    kind: 'action',
  },
]

/** The seed trail, minus today's events that cannot have happened in the given scenario. */
export function seedAudit(scenario: Scenario): AuditEntry[] {
  const isToday = (e: AuditEntry) => e.time.startsWith('Today')
  if (scenario === 'noCheckins') return SEED.filter((e) => !isToday(e))
  if (scenario === 'allGreen') return SEED.filter((e) => !(isToday(e) && e.kind === 'alert'))
  return SEED
}

/** Alerts that were raised and resolved before today. */
export const RESOLVED_ALERTS: PastAlert[] = [
  {
    athleteId: 'liam',
    name: 'Liam Smith',
    status: 'high',
    reason: 'Reported headache',
    detected: 'Fri, Oct 2 · 4:02 PM',
    action: 'Reviewed with athlete',
  },
  {
    athleteId: 'mia',
    name: 'Mia Thomas',
    status: 'review',
    reason: 'Soreness well above usual level',
    detected: 'Thu, Oct 1 · 8:20 AM',
    action: 'Modified training',
  },
]

export interface CoachNotification {
  id: string
  status: Status
  text: string
  time: string
  /** Where clicking the notification goes. */
  to: string
}

/** Safety symptoms, notable fatigue changes and team patterns — newest alerts first. */
export function buildNotifications(roster: Athlete[], fatigueAboveUsual: number, showPattern: boolean): CoachNotification[] {
  const items: CoachNotification[] = []
  for (const a of roster) {
    const time = alertTimeLabel(a)
    if (a.status === 'high') {
      items.push({
        id: `alert-${a.id}`,
        status: 'high',
        text: `${a.name} reported ${a.symptoms.map((s) => s.toLowerCase()).join(' and ')}.`,
        time,
        to: paths.alert(a.id),
      })
    } else if (a.signals[0]?.compare[0]?.metric === 'Fatigue') {
      items.push({
        id: `fatigue-${a.id}`,
        status: 'review',
        text: `${a.name}’s fatigue is significantly above baseline.`,
        time,
        to: paths.alert(a.id),
      })
    }
  }
  if (showPattern) {
    items.push({
      id: 'team-fatigue',
      status: 'review',
      text: `${fatigueAboveUsual} athletes reported elevated fatigue today.`,
      time: 'Today, 8:35 AM',
      to: paths.athletes('fatigue'),
    })
  }
  return items
}
