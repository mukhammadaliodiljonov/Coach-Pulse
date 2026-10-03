const DAY_MS = 24 * 60 * 60 * 1000

/** "8:42 AM" */
export function formatClock(date: Date): string {
  const hours = date.getHours()
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours % 12 || 12}:${minutes} ${hours < 12 ? 'AM' : 'PM'}`
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

/** Whole calendar days from `earlier` to `later` (0 = same day). */
export function daysBetween(earlier: Date, later: Date): number {
  return Math.round((startOfDay(later) - startOfDay(earlier)) / DAY_MS)
}

/** "Today, 8:42 AM", "Sun, 6:20 PM" within the last week, otherwise "Oct 2, 4:02 PM". */
export function formatActivityTime(date: Date, now: Date): string {
  const days = daysBetween(date, now)
  if (days === 0) return `Today, ${formatClock(date)}`
  if (days > 0 && days < 7) return `${date.toLocaleDateString('en-US', { weekday: 'short' })}, ${formatClock(date)}`
  return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${formatClock(date)}`
}

/** "Fri, Oct 2 · 4:02 PM" */
export function formatDateTime(date: Date): string {
  return `${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · ${formatClock(date)}`
}

/** Age in whole years on `today`, from an ISO date of birth like "2010-03-14". */
export function ageOn(dateOfBirth: string, today: Date): number {
  const [year, month, day] = dateOfBirth.split('-').map(Number)
  const hadBirthday = today.getMonth() + 1 > month || (today.getMonth() + 1 === month && today.getDate() >= day)
  return today.getFullYear() - year - (hadBirthday ? 0 : 1)
}

/** Parses "YYYY-MM-DD" as a local date (not UTC midnight). */
export function parseLocalDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day)
}
