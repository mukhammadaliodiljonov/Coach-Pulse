import { describe, expect, it } from 'vitest'
import { ageOn, daysBetween, formatActivityTime, formatClock, formatDateTime, parseLocalDate } from './time'

// Local times (no "Z") keep these independent of the machine's time zone.
const now = new Date('2026-10-05T09:00:00')

describe('time helpers', () => {
  it('formats clock times', () => {
    expect(formatClock(new Date('2026-10-05T08:05:00'))).toBe('8:05 AM')
    expect(formatClock(new Date('2026-10-05T12:30:00'))).toBe('12:30 PM')
    expect(formatClock(new Date('2026-10-05T00:15:00'))).toBe('12:15 AM')
  })

  it('counts calendar days', () => {
    expect(daysBetween(new Date('2026-10-04T23:59:00'), now)).toBe(1)
    expect(daysBetween(new Date('2026-10-05T00:01:00'), now)).toBe(0)
  })

  it('labels activity relative to today', () => {
    expect(formatActivityTime(new Date('2026-10-05T08:42:00'), now)).toBe('Today, 8:42 AM')
    expect(formatActivityTime(new Date('2026-10-04T18:20:00'), now)).toBe('Sun, 6:20 PM')
    expect(formatActivityTime(new Date('2026-09-20T16:02:00'), now)).toBe('Sep 20, 4:02 PM')
  })

  it('formats a full date and time', () => {
    expect(formatDateTime(new Date('2026-10-02T16:02:00'))).toBe('Fri, Oct 2 · 4:02 PM')
  })

  it('works out age from a date of birth', () => {
    expect(ageOn('2010-03-14', now)).toBe(16)
    expect(ageOn('2010-10-05', now)).toBe(16)
    expect(ageOn('2010-10-06', now)).toBe(15)
  })

  it('parses ISO dates as local dates', () => {
    expect(parseLocalDate('2026-10-04').getDate()).toBe(4)
  })
})
