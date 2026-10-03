import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { describeError } from '../api/client'
import type { ReminderKey } from '../data/athleteApp'
import { createAthleteSource, DATA_SOURCE } from '../sources'
import type { AthleteSnapshot, DailyCheckInInput, PostTrainingInput } from '../sources/types'
import { AthleteStoreContext, type AthleteStore } from './athleteStore'
import { readScenario } from './scenario'

export function AthleteStoreProvider({ children }: { children: ReactNode }) {
  const [source] = useState(() => createAthleteSource(readScenario()))
  const [snapshot, setSnapshot] = useState<AthleteSnapshot | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reminders, setReminders] = useState<Record<ReminderKey, boolean>>({
    daily: true,
    post: true,
    coachMsg: true,
  })

  const signIn = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setSnapshot(await source.load())
      return true
    } catch (e) {
      setError(describeError(e))
      return false
    } finally {
      setLoading(false)
    }
  }, [source])

  // After a check-in, refresh so home and history show it; the check-in itself is already saved.
  const refresh = useCallback(async () => {
    try {
      setSnapshot(await source.load())
    } catch {
      // Keep the last data.
    }
  }, [source])

  const submitDaily = useCallback(
    async (input: DailyCheckInInput) => {
      await source.submitDaily(input)
      await refresh()
    },
    [source, refresh],
  )

  const submitPostTraining = useCallback(
    async (input: PostTrainingInput) => {
      await source.submitPostTraining(input)
      await refresh()
    },
    [source, refresh],
  )

  const store = useMemo<AthleteStore>(
    () => ({
      dataSource: DATA_SOURCE,
      signedIn: snapshot !== null,
      loading,
      error,
      snapshot,
      signIn,
      signOut: () => setSnapshot(null),
      submitDaily,
      submitPostTraining,
      reminders,
      toggleReminder: (key) => setReminders((prev) => ({ ...prev, [key]: !prev[key] })),
    }),
    [snapshot, loading, error, signIn, submitDaily, submitPostTraining, reminders],
  )

  return <AthleteStoreContext.Provider value={store}>{children}</AthleteStoreContext.Provider>
}
