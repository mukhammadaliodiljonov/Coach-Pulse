import type { AuditEntry } from '../../domain/types'
import { cx } from '../../lib/cx'
import ui from '../../styles/ui.module.css'
import styles from './AuditFeed.module.css'

const KIND_LABELS = { alert: 'Alert', checkin: 'Check-in', action: 'Coach action' } as const

interface AuditFeedProps {
  entries: AuditEntry[]
  /** "feed" separates entries with lines; "timeline" joins them with a rail. */
  variant?: 'feed' | 'timeline'
  compact?: boolean
}

/** Audit entries; the dot colour (red alert, purple check-in, green coach action) is also spelled out for screen readers. */
export function AuditFeed({ entries, variant = 'feed', compact = false }: AuditFeedProps) {
  return (
    <ul className={cx(styles.list, styles[variant], compact && styles.compact)}>
      {entries.map((e) => {
        const dot = <span className={styles.dot} data-kind={e.kind} aria-hidden="true" />
        return (
          <li key={e.id} className={styles.item}>
            {variant === 'timeline' ? (
              <span className={styles.rail}>
                {dot}
                <span className={styles.line} />
              </span>
            ) : (
              dot
            )}
            <div className={styles.body}>
              <span className={styles.text}>
                <span className={ui.srOnly}>{KIND_LABELS[e.kind]}: </span>
                {e.text}
              </span>
              {e.notes && <span className={styles.notes}>“{e.notes}”</span>}
              <span className={styles.meta}>
                {e.who} · {e.time}
              </span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
