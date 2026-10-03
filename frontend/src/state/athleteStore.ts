import { createContext, useContext } from 'react'
import type { ReminderKey } from '../data/athleteApp'
import type { AthleteSnapshot, DailyCheckInInput, DataSourceKind, PostTrainingInput } from '../sources/types'

export interface AthleteStore {
  dataSource: DataSourceKind
  /** Signed in and loaded. */
  signedIn: boolean
  /** Signing in. */
  loading: boolean
  /** Why signing in failed. */
  error: string | null
  snapshot: AthleteSnapshot | null
  /** Resolves true once signed in. */
  signIn: () => Promise<boolean>
  signOut: () => void
  /** Each rejects if the check-in couldn't be sent. */
  submitDaily: (input: DailyCheckInInput) => Promise<void>
  submitPostTraining: (input: PostTrainingInput) => Promise<void>
  reminders: Record<ReminderKey, boolean>
  toggleReminder: (key: ReminderKey) => void
}

export const AthleteStoreContext = createContext<AthleteStore | null>(null)

export function useAthleteStore(): AthleteStore {
  const store = useContext(AthleteStoreContext)
  if (!store) throw new Error('useAthleteStore must be used inside <AthleteStoreProvider>')
  return store
}
