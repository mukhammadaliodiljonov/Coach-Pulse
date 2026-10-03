import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { describeError, isUnreachable } from '../api/client'
import { summarizeTeam } from '../domain/team'
import type { Athlete, CoachAction, CoachInfo, TeamInfo } from '../domain/types'
import { createCoachSource, DATA_SOURCE } from '../sources'
import { NoTeamError, type CoachSnapshot } from '../sources/types'
import { CoachStoreContext, type CoachPrefs, type CoachStore, type LoadStatus, type Toast } from './coachStore'
import { readScenario } from './scenario'

const TOAST_MS = 3200
const REFRESH_MS = 60_000

const NO_TEAM: TeamInfo = { name: '', sport: '', ageGroup: null, joinCode: null }
const NO_COACH: CoachInfo = { name: '', shortName: '', initials: '', role: '', email: '' }
const NO_ATHLETES: Athlete[] = []

export function CoachStoreProvider({ children }: { children: ReactNode }) {
  const [scenario] = useState(readScenario)
  const [source] = useState(() => createCoachSource(scenario))

  const [snapshot, setSnapshot] = useState<CoachSnapshot | null>(null)
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const hasData = useRef(false)

  const reload = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const next = await source.load(signal)
        hasData.current = true
        setSnapshot(next)
        setStatus('ready')
        setLoadError(null)
        setOffline(false)
        setLastUpdated(new Date())
        return true
      } catch (error) {
        if (signal?.aborted) return false
        // With data on screen, keep it and only flag a lost connection.
        if (hasData.current) {
          if (isUnreachable(error)) setOffline(true)
          return false
        }
        setStatus(error instanceof NoTeamError ? 'no-team' : 'error')
        setLoadError(describeError(error))
        return false
      }
    },
    [source],
  )

  // First load. In development StrictMode mounts twice; the abort cancels the first request.
  useEffect(() => {
    const controller = new AbortController()
    // Fetching is the external system this effect syncs with; state is only set after the response.
    // oxlint-disable-next-line react/set-state-in-effect
    void reload(controller.signal).then((ok) => {
      if (ok && source.startsOffline) setOffline(true)
    })
    return () => controller.abort()
  }, [reload, source])

  // Keep the backend's data fresh so new check-ins appear: poll while the page is visible,
  // and refresh when it becomes visible again or the connection comes back.
  useEffect(() => {
    if (DATA_SOURCE !== 'api') return
    const refresh = () => void reload()
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    const timer = window.setInterval(refreshIfVisible, REFRESH_MS)
    document.addEventListener('visibilitychange', refreshIfVisible)
    window.addEventListener('online', refresh)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', refreshIfVisible)
      window.removeEventListener('online', refresh)
    }
  }, [reload])

  const roster = snapshot?.roster ?? NO_ATHLETES
  const team = useMemo(() => summarizeTeam(roster), [roster])
  const byId = useMemo(() => new Map(roster.map((a) => [a.id, a])), [roster])

  const [actionTargetId, setActionTargetId] = useState<string | null>(null)
  const [assistantPath, setAssistantPath] = useState<string | null>(null)
  const [prefs, setPrefs] = useState<CoachPrefs>({
    symptomImmediate: true,
    welfareOfficer: true,
    guardianPrompt: false,
    email: true,
    dashboard: true,
    push: true,
    weeklyDigest: false,
  })

  const [toast, setToast] = useState<Toast | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)
  const showToast = useCallback((message: string) => {
    window.clearTimeout(toastTimer.current)
    setToast({ id: crypto.randomUUID(), message })
    toastTimer.current = window.setTimeout(() => setToast(null), TOAST_MS)
  }, [])
  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  const recordAction = useCallback(
    async (athleteId: string, action: CoachAction, notes: string) => {
      const athlete = byId.get(athleteId)
      if (!athlete) throw new Error('This athlete is no longer on the roster.')
      const entry = await source.recordAction(athlete, action, notes)
      setSnapshot((prev) =>
        prev && { ...prev, audit: [entry, ...prev.audit], actions: { ...prev.actions, [athleteId]: action } },
      )
      setActionTargetId(null)
      showToast(`Saved to ${athlete.firstName}’s follow-up history`)
    },
    [byId, source, showToast],
  )

  const store = useMemo<CoachStore>(
    () => ({
      dataSource: DATA_SOURCE,
      scenario,
      status,
      loadError,
      offline,
      lastUpdated,
      reload: () => reload(),
      teamInfo: snapshot?.team ?? NO_TEAM,
      coach: snapshot?.coach ?? NO_COACH,
      roster,
      team,
      athlete: (id) => (id ? byId.get(id) : undefined),
      audit: snapshot?.audit ?? [],
      pastAlerts: snapshot?.pastAlerts ?? [],
      actions: snapshot?.actions ?? {},
      teamLoadChangePct: snapshot?.teamLoadChangePct ?? null,
      recordAction,
      actionTarget: (actionTargetId && byId.get(actionTargetId)) || null,
      openRecordAction: (athleteId) => {
        setAssistantPath(null)
        setActionTargetId(athleteId)
      },
      closeRecordAction: () => setActionTargetId(null),
      assistantPath,
      setAssistantPath,
      toast,
      showToast,
      prefs,
      togglePref: (key) => setPrefs((prev) => ({ ...prev, [key]: !prev[key] })),
    }),
    [
      scenario,
      status,
      loadError,
      offline,
      lastUpdated,
      reload,
      snapshot,
      roster,
      team,
      byId,
      recordAction,
      actionTargetId,
      assistantPath,
      toast,
      showToast,
      prefs,
    ],
  )

  return <CoachStoreContext.Provider value={store}>{children}</CoachStoreContext.Provider>
}
