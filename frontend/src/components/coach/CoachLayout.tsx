import { Outlet } from 'react-router'
import { useCoachStore } from '../../state/coachStore'
import { Toast } from '../ui/Toast'
import { AssistantDrawer } from './AssistantDrawer'
import { BottomNav } from './BottomNav'
import styles from './CoachLayout.module.css'
import { RecordActionModal } from './RecordActionModal'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export function CoachLayout() {
  const { toast } = useCoachStore()
  return (
    <div className={styles.shell}>
      <a href="#main" className={styles.skip}>
        Skip to content
      </a>
      <Sidebar />
      <main id="main" tabIndex={-1} className={styles.main}>
        <TopBar />
        <Outlet />
      </main>
      <BottomNav />
      <RecordActionModal />
      <AssistantDrawer />
      <Toast toast={toast} />
    </div>
  )
}
