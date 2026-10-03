import type { ReactNode } from 'react'
import { DATA_SOURCE } from '../../sources'
import styles from './SampleDataNote.module.css'

/**
 * When the app runs against the backend, marks screens (or parts) that still use sample data
 * because their endpoints don't exist yet. Hidden in sample-data mode.
 */
export function SampleDataNote({ children }: { children: ReactNode }) {
  if (DATA_SOURCE !== 'api') return null
  return (
    <p className={styles.note}>
      <span className={styles.dot} aria-hidden="true" />
      <span>{children}</span>
    </p>
  )
}
