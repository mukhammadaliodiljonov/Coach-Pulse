// Fictional sample team from the design handoff. Replace with API data.

export const TEAM = {
  name: 'Northside U17',
  sport: 'Football',
  ageGroup: 'U17',
  code: 'NSU-17K4',
  welfareEmail: 'welfare@northsidefc.org',
  coach: {
    name: 'Sam Rivera',
    shortName: 'Coach Rivera',
    initials: 'SR',
    role: 'Head coach',
    email: 'sam.rivera@northsidefc.org',
  },
} as const

/** All sample data is anchored to this day. */
export const DEMO_DAY = 'Monday, October 5'

/** Team averages over the previous 21 days — the dashed "usual" lines. */
export const TEAM_BASELINE = {
  wellness: 3.9,
  fatigue: 2.1,
  soreness: 2.0,
  load: 545,
} as const
