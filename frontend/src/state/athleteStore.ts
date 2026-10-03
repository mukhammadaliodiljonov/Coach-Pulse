import { createContext, useContext } from 'react'
import type { DailyAnswers, ReminderKey } from '../data/athleteApp'
import type { CheckInFlow } from '../navigation/paths'

export interface AthleteStore {
  signedIn: boolean
  signIn: () => void
  signOut: () => void
  /** Check-ins submitted today. */
  completed: Partial<Record<CheckInFlow, boolean>>
  /** Today's daily check-in answers, once submitted. */
  todayAnswers: DailyAnswers | null
  completeCheckIn: (flow: CheckInFlow, daily?: DailyAnswers) => void
  reminders: Record<ReminderKey, boolean>
  toggleReminder: (key: ReminderKey) => void
}

export const AthleteStoreContext = createContext<AthleteStore | null>(null)

export function useAthleteStore(): AthleteStore {
  const store = useContext(AthleteStoreContext)
  if (!store) throw new Error('useAthleteStore must be used inside <AthleteStoreProvider>')
  return store
}
