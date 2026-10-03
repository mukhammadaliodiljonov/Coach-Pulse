import { describe, expect, it } from 'vitest'
import { detectSignals } from '../domain/signals'
import {
  actionsFromDay,
  actionToAuditEntry,
  CODE_BY_ACTION,
  CODE_BY_SYMPTOM,
  signalsFromReasons,
  teamLoadChange,
  toAthlete,
  toAthleteProfile,
  toAuditEntry,
  toCheckIn,
  toCoachInfo,
  toFeelingWeek,
  toHistoryDays,
  toPastAlert,
} from './adapters'
import type { AthleteDayDto, CheckinDayDto, TeamDto, UserDto } from './types'

// Local timestamps (no "Z") keep the expected clock times independent of the machine's time zone.
const now = new Date('2026-10-05T09:00:00')

const alexDay: AthleteDayDto = {
  athleteId: 'a-1',
  firstName: 'Alex',
  lastName: 'Johnson',
  position: 'Midfielder',
  dateOfBirth: '2010-03-14',
  morningCheckin: {
    id: 'm-1',
    createdAt: '2026-10-05T08:12:00',
    sleepQuality: 3,
    fatigue: 5,
    muscleSoreness: 4,
    overallWellness: 2,
    symptoms: [],
    notes: null,
  },
  latestWorkout: {
    id: 'w-1',
    createdAt: '2026-10-04T18:20:00',
    rpe: 10,
    durationMinutes: 78,
    tiredness: 5,
    muscleSoreness: 4,
    preWeightKg: null,
    postWeightKg: null,
    symptoms: ['HEADACHE', 'DIZZINESS'],
  },
  baseline: {
    windowDays: 21,
    sleepQuality: 4.04,
    fatigue: 2,
    muscleSoreness: 2,
    overallWellness: 4,
    trainingLoad: { meanAu: 575, lowAu: 500, highAu: 650 },
  },
  loadHistory: [
    { date: '2026-10-03', loadAu: 0 },
    { date: '2026-10-04', loadAu: 780 },
  ],
  assessment: null,
  alert: { id: 'al-1', status: 'OPEN', createdAt: '2026-10-05T08:42:00', latestAction: null },
}

describe('toCheckIn', () => {
  it('maps today’s check-in, baseline and latest session', () => {
    expect(toCheckIn(alexDay, now)).toEqual({
      id: 'a-1',
      name: 'Alex Johnson',
      position: 'Midfielder',
      age: 16,
      wellness: 2,
      fatigue: 5,
      soreness: 4,
      sleep: '3/5',
      baseline: { wellness: 4, fatigue: 2, soreness: 2, sleep: '4/5' },
      load: 780,
      loadRange: { low: 500, high: 650 },
      loadChangePct: 36,
      loadHistory: [
        { date: '2026-10-03', load: 0 },
        { date: '2026-10-04', load: 780 },
      ],
      symptoms: ['Headache', 'Dizziness'],
      symptomNote: 'Reported after yesterday’s training',
      checkedInAt: '8:12 AM',
      alertRaisedAt: '8:42 AM',
      alertId: 'al-1',
      lastSession: '78 min × RPE 10',
    })
  })

  it('leaves today’s values empty while the check-in is pending', () => {
    const pending = toCheckIn(
      {
        ...alexDay,
        morningCheckin: null,
        alert: null,
        latestWorkout: { ...alexDay.latestWorkout!, createdAt: '2026-10-01T18:00:00' },
      },
      now,
    )
    expect(pending).toMatchObject({ wellness: null, fatigue: null, soreness: null, sleep: null, checkedInAt: null })
    // Symptoms from a session four days ago no longer count.
    expect(pending.symptoms).toEqual([])
    expect(pending.load).toBe(780)
  })

  it('has no baseline or load comparison for a new athlete', () => {
    const fresh = toCheckIn({ ...alexDay, baseline: null, latestWorkout: null, dateOfBirth: null }, now)
    expect(fresh).toMatchObject({ baseline: null, loadRange: null, loadChangePct: null, load: null, age: null })
  })
})

describe('toAthlete', () => {
  it('evaluates locally until the server has assessed the athlete', () => {
    const alex = toAthlete(alexDay, now)
    expect(alex.status).toBe('high')
    expect(alex.signals.map((s) => s.kind)).toEqual(['Safety symptom', 'Recovery signal', 'Training signal'])
  })

  it('uses the server’s assessment when there is one', () => {
    const assessed = toAthlete(
      {
        ...alexDay,
        latestWorkout: { ...alexDay.latestWorkout!, symptoms: [] },
        assessment: {
          id: 'r-1',
          createdAt: '2026-10-05T08:40:00',
          riskStatus: 'YELLOW',
          engineVersion: 'signals-1',
          reasons: [{ kind: 'RECOVERY', metric: 'SORENESS', value: 4, baseline: 2 }],
        },
      },
      now,
    )
    expect(assessed).toMatchObject({ status: 'review', reason: 'Soreness well above usual level' })
  })
})

describe('signalsFromReasons', () => {
  it('words server reasons exactly like the local engine', () => {
    const local = detectSignals(toCheckIn(alexDay, now))
    const fromServer = signalsFromReasons(
      [
        { kind: 'SAFETY_SYMPTOM', symptoms: ['HEADACHE', 'DIZZINESS'], source: 'WORKOUT_CHECKIN' },
        { kind: 'RECOVERY', metric: 'WELLNESS', value: 2, baseline: 4 },
        { kind: 'RECOVERY', metric: 'FATIGUE', value: 5, baseline: 2 },
        { kind: 'RECOVERY', metric: 'SORENESS', value: 4, baseline: 2 },
        { kind: 'TRAINING_LOAD', loadAu: 780, baselineLowAu: 500, baselineHighAu: 650, changePct: 35.7 },
      ],
      'Alex',
      { symptomNote: 'Reported after yesterday’s training', lastSession: '78 min × RPE 10' },
    )
    expect(fromServer).toEqual(local)
  })
})

describe('activity and alerts', () => {
  it('writes audit entries for each kind of activity', () => {
    const base = { id: 'e', athleteId: 'a-1', athleteName: 'Alex Johnson' }
    expect(
      toAuditEntry(
        {
          ...base,
          type: 'ALERT_RAISED',
          createdAt: '2026-10-05T08:42:00',
          riskStatus: 'RED',
          reasons: [{ kind: 'SAFETY_SYMPTOM', symptoms: ['HEADACHE', 'DIZZINESS'], source: 'WORKOUT_CHECKIN' }],
        },
        now,
      ),
    ).toMatchObject({
      kind: 'alert',
      who: 'CoachPulse',
      time: 'Today, 8:42 AM',
      text: 'High-priority alert raised — Alex Johnson: reported headache + dizziness',
    })
    expect(toAuditEntry({ ...base, type: 'MORNING_CHECKIN', createdAt: '2026-10-05T08:12:00' }, now).text).toBe(
      'Alex Johnson submitted daily check-in',
    )
    expect(
      toAuditEntry(
        { ...base, type: 'WORKOUT_CHECKIN', createdAt: '2026-10-04T18:20:00', durationMinutes: 78, rpe: 10 },
        now,
      ),
    ).toMatchObject({ time: 'Sun, 6:20 PM', text: 'Alex Johnson submitted post-training check-in (78 min, RPE 10)' })
    expect(
      actionToAuditEntry(
        {
          id: 'c-1',
          athleteId: 'a-1',
          alertId: 'al-1',
          action: 'MODIFIED_TRAINING',
          notes: 'Reduced sprint volume.',
          coachName: 'Coach Rivera',
          createdAt: '2026-10-05T08:55:00',
        },
        'Alex Johnson',
        now,
      ),
    ).toMatchObject({
      kind: 'action',
      who: 'Coach Rivera',
      text: 'Modified training — Alex Johnson',
      notes: 'Reduced sprint volume.',
    })
  })

  it('summarises a past alert with its outcome', () => {
    expect(
      toPastAlert({
        id: 'al-9',
        athleteId: 'a-2',
        athleteName: 'Liam Smith',
        status: 'RESOLVED',
        createdAt: '2026-10-02T16:02:00',
        riskStatus: 'RED',
        reasons: [{ kind: 'SAFETY_SYMPTOM', symptoms: ['HEADACHE'], source: 'MORNING_CHECKIN' }],
        latestAction: {
          id: 'c-9',
          athleteId: 'a-2',
          alertId: 'al-9',
          action: 'REVIEWED_WITH_ATHLETE',
          notes: null,
          coachName: 'Coach Rivera',
          createdAt: '2026-10-02T17:00:00',
        },
      }),
    ).toEqual({
      athleteId: 'a-2',
      name: 'Liam Smith',
      status: 'high',
      reason: 'Reported headache',
      detected: 'Fri, Oct 2 · 4:02 PM',
      action: 'Reviewed with athlete',
    })
  })

  it('collects actions already recorded today', () => {
    const acted: AthleteDayDto = {
      ...alexDay,
      alert: {
        id: 'al-1',
        status: 'ACKNOWLEDGED',
        createdAt: '2026-10-05T08:42:00',
        latestAction: {
          id: 'c-1',
          athleteId: 'a-1',
          alertId: 'al-1',
          action: 'CONTACTED_GUARDIAN',
          notes: null,
          coachName: 'Coach Rivera',
          createdAt: '2026-10-05T08:50:00',
        },
      },
    }
    expect(actionsFromDay([alexDay, acted])).toEqual({ 'a-1': 'Contacted parent/guardian' })
  })

  it('averages the team’s load change', () => {
    const alex = toCheckIn(alexDay, now)
    expect(teamLoadChange([alex, { ...alex, loadChangePct: 0 }, { ...alex, loadChangePct: null }])).toBe(18)
    expect(teamLoadChange([])).toBeNull()
  })
})

describe('codes', () => {
  it('maps symptoms and actions both ways', () => {
    expect(CODE_BY_SYMPTOM['Light sensitivity']).toBe('LIGHT_SENSITIVITY')
    expect(CODE_BY_ACTION['Referred to medical professional']).toBe('REFERRED_TO_MEDICAL')
  })
})

describe('people', () => {
  const user: UserDto = { id: 'u-1', email: 'sam@club.org', firstName: 'Sam', lastName: 'Rivera', role: 'COACH' }
  const team: TeamDto = {
    id: 't-1',
    name: 'Northside U17',
    sport: 'Football',
    ageGroup: 'U17',
    joinCode: 'NSU-17K4',
    coaches: [
      { userId: 'u-1', firstName: 'Sam', lastName: 'Rivera', memberRole: 'HEAD_COACH' },
      { userId: 'u-2', firstName: 'Priya', lastName: 'Shah', memberRole: 'ASSISTANT_COACH' },
    ],
  }

  it('describes the signed-in coach', () => {
    expect(toCoachInfo(user, { teamId: 't-1', name: 'Northside U17', sport: 'Football', memberRole: 'HEAD_COACH' })).toEqual({
      name: 'Sam Rivera',
      shortName: 'Coach Rivera',
      initials: 'SR',
      role: 'Head coach',
      email: 'sam@club.org',
    })
  })

  it('tells athletes who can see their answers', () => {
    const athlete: UserDto = { ...user, id: 'u-3', firstName: 'Alex', lastName: 'Johnson', role: 'ATHLETE' }
    expect(toAthleteProfile(athlete, 'a-1', team)).toMatchObject({
      firstName: 'Alex',
      coachName: 'Coach Rivera',
      coachInitials: 'SR',
      visibleTo: 'Coach Sam Rivera and assistant coach Priya Shah',
    })
  })
})

describe('athlete history', () => {
  const days: CheckinDayDto[] = [
    {
      date: '2026-10-05',
      morning: { ...alexDay.morningCheckin! },
      workout: null,
    },
    { date: '2026-10-04', morning: null, workout: { ...alexDay.latestWorkout! } },
  ]

  it('lists each day newest first', () => {
    expect(toHistoryDays(days, now)).toEqual([
      { label: 'Today', values: [3, 5, 4, 2], session: undefined },
      { label: 'Sun 4', values: null, session: 'Session · 78 min · RPE 10' },
    ])
  })

  it('charts overall feeling oldest first', () => {
    expect(toFeelingWeek(days)).toEqual([
      { day: 'S', value: null },
      { day: 'M', value: 2 },
    ])
  })
})
