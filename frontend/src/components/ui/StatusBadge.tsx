import { STATUS_LABELS, type Status } from '../../domain/types'
import { cx } from '../../lib/cx'
import { Icon } from './Icon'
import styles from './StatusBadge.module.css'

const SIZES = {
  sm: { height: 24, fontSize: 12, icon: 14, padding: '0 10px 0 6px' },
  md: { height: 30, fontSize: 13, icon: 16, padding: '0 12px 0 8px' },
  lg: { height: 36, fontSize: 15, icon: 18, padding: '0 14px 0 9px' },
} as const

interface StatusBadgeProps {
  status: Status
  size?: keyof typeof SIZES
  /** Just the shape: circle "!" (high), diamond "!" (review) or circle check (normal). */
  iconOnly?: boolean
  iconSize?: number
  label?: string
  className?: string
}

export function StatusBadge({ status, size = 'md', iconOnly = false, iconSize = 20, label, className }: StatusBadgeProps) {
  const text = label ?? STATUS_LABELS[status]
  const s = SIZES[size]
  const icon = iconOnly ? iconSize : s.icon
  const diamond = status === 'review'
  // The rotated square is drawn smaller so its diagonal matches the circles.
  const shape = diamond ? Math.round(icon * 0.82) : icon
  return (
    <span
      role="img"
      aria-label={text}
      title={text}
      data-status={status}
      className={cx(styles.badge, iconOnly && styles.iconOnly, className)}
      style={{
        height: iconOnly ? icon : s.height,
        padding: iconOnly ? 0 : s.padding,
        fontSize: s.fontSize,
      }}
    >
      <span
        className={styles.icon}
        style={{
          width: shape,
          height: shape,
          borderRadius: diamond ? Math.round(icon * 0.22) : undefined,
        }}
      >
        {status === 'normal' ? (
          <Icon name="done" size={Math.round(icon * 0.58)} />
        ) : (
          <span className={styles.glyph} style={{ fontSize: Math.round(icon * 0.72) }}>
            !
          </span>
        )}
      </span>
      {!iconOnly && <span aria-hidden="true">{text}</span>}
    </span>
  )
}
