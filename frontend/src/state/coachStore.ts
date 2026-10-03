import { createContext, useContext } from 'react'
import type { Scenario } from '../data/roster'
import type { TeamSummary } from '../domain/team'
import type { Athlete, AuditEntry, CoachAction } from '../domain/types'

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

export interface CoachStore {
  scenario: Scenario
  /** Today's roster, evaluated and sorted by attention level. */
  roster: Athlete[]
  team: TeamSummary
  athlete: (id: string | undefined) => Athlete | undefined
  /** Append-only audit trail, newest coach actions first. */
  audit: AuditEntry[]
  /** The latest action recorded today, per athlete id. */
  actions: Partial<Record<string, CoachAction>>
  recordAction: (athleteId: string, action: CoachAction, notes: string) => void
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
