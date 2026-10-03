import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { seedAudit } from '../data/activity'
import { buildRoster } from '../data/roster'
import { TEAM } from '../data/team'
import { evaluateAthlete, sortByAttention } from '../domain/signals'
import { summarizeTeam } from '../domain/team'
import type { AuditEntry, CoachAction } from '../domain/types'
import { formatClock } from '../lib/time'
import { CoachStoreContext, type CoachPrefs, type CoachStore, type Toast } from './coachStore'
import { readScenario } from './scenario'

const TOAST_MS = 3200

export function CoachStoreProvider({ children }: { children: ReactNode }) {
  const [scenario] = useState(readScenario)
  const roster = useMemo(() => sortByAttention(buildRoster(scenario).map(evaluateAthlete)), [scenario])
  const team = useMemo(() => summarizeTeam(roster), [roster])
  const byId = useMemo(() => new Map(roster.map((a) => [a.id, a])), [roster])

  const [actions, setActions] = useState<Partial<Record<string, CoachAction>>>({})
  const [recorded, setRecorded] = useState<AuditEntry[]>([])
  const audit = useMemo(() => [...recorded, ...seedAudit(scenario)], [recorded, scenario])

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
    (athleteId: string, action: CoachAction, notes: string) => {
      const athlete = byId.get(athleteId)
      if (!athlete) return
      const entry: AuditEntry = {
        id: crypto.randomUUID(),
        athleteId,
        time: `Today, ${formatClock(new Date())}`,
        who: TEAM.coach.shortName,
        text: `${action} — ${athlete.name}`,
        notes: notes.trim() || undefined,
        kind: 'action',
      }
      setRecorded((prev) => [entry, ...prev])
      setActions((prev) => ({ ...prev, [athleteId]: action }))
      setActionTargetId(null)
      showToast(`Saved to ${athlete.firstName}’s follow-up history`)
    },
    [byId, showToast],
  )

  const store = useMemo<CoachStore>(
    () => ({
      scenario,
      roster,
      team,
      athlete: (id) => (id ? byId.get(id) : undefined),
      audit,
      actions,
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
    [scenario, roster, team, byId, audit, actions, recordAction, actionTargetId, assistantPath, toast, showToast, prefs],
  )

  return <CoachStoreContext.Provider value={store}>{children}</CoachStoreContext.Provider>
}
