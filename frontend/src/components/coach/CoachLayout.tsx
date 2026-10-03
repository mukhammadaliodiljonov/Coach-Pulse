import { Outlet } from 'react-router'
import { useCoachStore } from '../../state/coachStore'
import { CoachStoreProvider } from '../../state/CoachStoreProvider'
import { Toast } from '../ui/Toast'
import { AssistantDrawer } from './AssistantDrawer'
import { BottomNav } from './BottomNav'
import styles from './CoachLayout.module.css'
import { LoadError, NoTeam, OfflineBanner, PageSkeleton } from './LoadStates'
import { RecordActionModal } from './RecordActionModal'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

/** The coach app. Its data loads only once a coach has reached it, i.e. after sign-in. */
export function CoachApp() {
  return (
    <CoachStoreProvider>
      <CoachLayout />
    </CoachStoreProvider>
  )
}

function CoachLayout() {
  const { status, offline, toast } = useCoachStore()
  return (
    <div className={styles.shell}>
      <a href="#main" className={styles.skip}>
        Skip to content
      </a>
      <Sidebar />
      <main id="main" tabIndex={-1} className={styles.main}>
        <TopBar />
        {offline && <OfflineBanner />}
        {/* Pages render once the team's data has loaded. */}
        {status === 'loading' ? (
          <PageSkeleton />
        ) : status === 'error' ? (
          <LoadError />
        ) : status === 'no-team' ? (
          <NoTeam />
        ) : (
          <Outlet />
        )}
      </main>
      <BottomNav />
      {status === 'ready' && (
        <>
          <RecordActionModal />
          <AssistantDrawer />
        </>
      )}
      <Toast toast={toast} />
    </div>
  )
}
