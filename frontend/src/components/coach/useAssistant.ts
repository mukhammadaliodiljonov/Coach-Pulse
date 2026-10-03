import { useLocation } from 'react-router'
import { useCoachStore } from '../../state/coachStore'

/** The assistant drawer stays open only on the page it was opened from, so navigating closes it. */
export function useAssistant() {
  const { assistantPath, setAssistantPath } = useCoachStore()
  const { pathname } = useLocation()
  return {
    open: assistantPath === pathname,
    setOpen: (open: boolean) => setAssistantPath(open ? pathname : null),
  }
}
