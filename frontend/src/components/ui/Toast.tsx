import { Icon } from './Icon'
import styles from './Toast.module.css'

interface ToastProps {
  /** Changing the id replays the entrance for a repeated message. */
  toast: { id: string; message: string } | null
}

/** Always mounted so screen readers announce each new message. */
export function Toast({ toast }: ToastProps) {
  return (
    <div role="status" aria-live="polite" className={styles.region}>
      {toast && (
        <div key={toast.id} className={styles.toast}>
          <span className={styles.check}>
            <Icon name="done" size={11} />
          </span>
          {toast.message}
        </div>
      )}
    </div>
  )
}
