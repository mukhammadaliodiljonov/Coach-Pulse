import type { AthleteCheckIn } from './types'

/** "Today, 8:42 AM" — when today's alert was raised, falling back to the check-in time. */
export function alertTimeLabel(a: AthleteCheckIn): string {
  const time = a.alertRaisedAt ?? a.checkedInAt
  return time ? `Today, ${time}` : 'Today'
}
