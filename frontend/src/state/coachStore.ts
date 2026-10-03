import { createContext, useContext } from 'react'
import type { Scenario } from '../data/roster'
import type { TeamSummary } from '../domain/team'
import type { Athlete, AuditEntry, CoachAction, CoachInfo, PastAlert, TeamInfo } from '../domain/types'
import type { DataSourceKind } from '../sources/types'

export interface CoachPrefs {
  /** Escalation */
  symptomImmediate: boolean
  welfareOfficer: boolean
  guardianPrompt: boolean
  /** Notification channels */
  email: boolean
  dashboard: boolean
  push: boolean
  weeklyDigest: boolean
}

export interface Toast {
  id: string
  message: string
}

/** "ready" once the first load succeeds; the coach pages only render then. */
export type LoadStatus = 'loading' | 'ready' | 'error'

export interface CoachStore {
  dataSource: DataSourceKind
  scenario: Scenario
  status: LoadStatus
  /** Why the first load failed. */
  loadError: string | null
  /** The connection dropped after loading; the last data is still shown. */
  offline: boolean
  lastUpdated: Date | null
  /** Fetches fresh data; resolves true on success. */
  reload: () => Promise<boolean>
  teamInfo: TeamInfo
  coach: CoachInfo
  /** Today's roster, evaluated and sorted by attention level. */
  roster: Athlete[]
  team: TeamSummary
  athlete: (id: string | undefined) => Athlete | undefined
  /** Append-only audit trail, newest first. */
  audit: AuditEntry[]
  pastAlerts: PastAlert[]
  /** The latest action recorded today, per athlete id. */
  actions: Partial<Record<string, CoachAction>>
  teamLoadChangePct: number | null
  /** Saves an action to the athlete's history. Rejects if it couldn't be saved. */
  recordAction: (athleteId: string, action: CoachAction, notes: string) => Promise<void>
  /** The athlete the "Record action" dialog is open for. */
  actionTarget: Athlete | null
  openRecordAction: (athleteId: string) => void
  closeRecordAction: () => void
  /** The page the assistant drawer was opened on (see useAssistant), or null when closed. */
  assistantPath: string | null
  setAssistantPath: (path: string | null) => void
  toast: Toast | null
  showToast: (message: string) => void
  prefs: CoachPrefs
  togglePref: (key: keyof CoachPrefs) => void
}

export const CoachStoreContext = createContext<CoachStore | null>(null)

export function useCoachStore(): CoachStore {
  const store = useContext(CoachStoreContext)
  if (!store) throw new Error('useCoachStore must be used inside <CoachStoreProvider>')
  return store
}
