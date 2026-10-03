import { Outlet } from 'react-router'
import { useCoachStore } from '../../state/coachStore'
import { Toast } from '../ui/Toast'
import { AssistantDrawer } from './AssistantDrawer'
import { BottomNav } from './BottomNav'
import styles from './CoachLayout.module.css'
import { LoadError, OfflineBanner, PageSkeleton } from './LoadStates'
import { RecordActionModal } from './RecordActionModal'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export function CoachLayout() {
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
        {status === 'loading' ? <PageSkeleton /> : status === 'error' ? <LoadError /> : <Outlet />}
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
