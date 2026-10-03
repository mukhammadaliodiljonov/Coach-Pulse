import { SYMPTOMS } from '../domain/types'

// Fictional content for the athlete app (Alex Johnson's view) from the design handoff.

export const ATHLETE_SELF = {
  id: 'alex',
  name: 'Alex Johnson',
  firstName: 'Alex',
  initials: 'AJ',
  position: 'Midfielder',
  guardian: 'Jordan Johnson · +44 7700 900123',
} as const

export const DAILY_QUESTIONS = [
  { key: 'sleep', question: 'How well did you sleep?', low: 'Poorly', high: 'Very well' },
  { key: 'fatigue', question: 'How tired do you feel?', low: 'Fresh', high: 'Exhausted' },
  { key: 'soreness', question: 'Any muscle soreness?', low: 'None', high: 'Very sore' },
  { key: 'wellness', question: 'How do you feel overall?', low: 'Not good', high: 'Great' },
] as const

export type DailyAnswers = Record<(typeof DAILY_QUESTIONS)[number]['key'], number>

export const RPE_WORDS = [
  '',
  'Very easy',
  'Very easy',
  'Easy',
  'Easy',
  'Moderate',
  'Moderate',
  'Hard',
  'Hard',
  'Very hard',
  'Maximum effort',
]

export const POST_LISTS = {
  tired: {
    question: 'How tired do you feel?',
    options: ['Fresh', 'Slightly tired', 'Moderately tired', 'Very tired', 'Exhausted'],
  },
  sore: {
    question: 'Any muscle soreness?',
    options: ['None', 'Mild', 'Moderate', 'Quite sore', 'Very sore'],
  },
} as const

export const SESSION_DURATIONS = [45, 60, 75, 90]

export const NONE_OF_THESE = 'None of these'
export const SAFETY_OPTIONS = [...SYMPTOMS, NONE_OF_THESE] as const

/** The athlete's last seven days, newest first; values are Sleep, Tiredness, Soreness, Feeling. */
export const HISTORY: { day: string; values: [number, number, number, number]; session?: string }[] = [
  { day: 'Sun 4', values: [4, 3, 3, 3], session: 'Match · 78 min · RPE 10' },
  { day: 'Sat 3', values: [4, 2, 2, 4] },
  { day: 'Fri 2', values: [4, 2, 2, 4], session: 'Training · 60 min · RPE 5' },
  { day: 'Thu 1', values: [5, 2, 2, 4] },
  { day: 'Wed 30', values: [4, 2, 3, 4], session: 'Conditioning · 75 min · RPE 7' },
  { day: 'Tue 29', values: [4, 2, 2, 4] },
]

/** Today's answers in the sample data, before the athlete checks in during this session. */
export const SAMPLE_TODAY: [number, number, number, number] = [3, 5, 4, 2]

/** "How you've been feeling" — overall feeling for the last seven days, oldest first. */
export const FEELING_WEEK = [
  { day: 'T', value: 4 },
  { day: 'W', value: 4 },
  { day: 'T', value: 4 },
  { day: 'F', value: 5 },
  { day: 'S', value: 4 },
  { day: 'S', value: 3 },
  { day: 'M', value: 2 },
]

export const SCHEDULE = [
  { day: 'Today', title: 'Training', time: '4:30 – 6:00 PM', place: 'Northside Park, Pitch 2' },
  { day: 'Wed 7', title: 'Conditioning', time: '4:30 – 5:45 PM', place: 'Northside Park, Pitch 2' },
  { day: 'Fri 9', title: 'Technical training', time: '4:30 – 5:30 PM', place: 'Indoor hall' },
  { day: 'Sun 11', title: 'Match vs Riverside U17', time: '10:00 AM', place: 'Riverside Ground · meet 9:00' },
]

export type ReminderKey = 'daily' | 'post' | 'coachMsg'

export const REMINDERS: { key: ReminderKey; label: string; sub: string }[] = [
  { key: 'daily', label: 'Daily check-in reminder', sub: '7:30 AM every day' },
  { key: 'post', label: 'Post-training reminder', sub: '30 min after each session' },
  { key: 'coachMsg', label: 'Messages from your coach', sub: 'Push notification' },
]
