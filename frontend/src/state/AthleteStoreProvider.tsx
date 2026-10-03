import { useMemo, useState, type ReactNode } from 'react'
import type { DailyAnswers, ReminderKey } from '../data/athleteApp'
import type { CheckInFlow } from '../navigation/paths'
import { AthleteStoreContext, type AthleteStore } from './athleteStore'

export function AthleteStoreProvider({ children }: { children: ReactNode }) {
  const [signedIn, setSignedIn] = useState(false)
  const [completed, setCompleted] = useState<Partial<Record<CheckInFlow, boolean>>>({})
  const [todayAnswers, setTodayAnswers] = useState<DailyAnswers | null>(null)
  const [reminders, setReminders] = useState<Record<ReminderKey, boolean>>({
    daily: true,
    post: true,
    coachMsg: true,
  })

  const store = useMemo<AthleteStore>(
    () => ({
      signedIn,
      signIn: () => setSignedIn(true),
      signOut: () => setSignedIn(false),
      completed,
      todayAnswers,
      completeCheckIn: (flow, daily) => {
        setCompleted((prev) => ({ ...prev, [flow]: true }))
        if (daily) setTodayAnswers(daily)
      },
      reminders,
      toggleReminder: (key) => setReminders((prev) => ({ ...prev, [key]: !prev[key] })),
    }),
    [signedIn, completed, todayAnswers, reminders],
  )

  return <AthleteStoreContext.Provider value={store}>{children}</AthleteStoreContext.Provider>
}
