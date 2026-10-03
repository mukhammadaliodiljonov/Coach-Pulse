import type { Status } from '../../domain/types'
import { cx } from '../../lib/cx'
import styles from './Avatar.module.css'

const SIZES = {
  32: { radius: 10, fontSize: 12 },
  36: { radius: 11, fontSize: 13 },
  40: { radius: 12, fontSize: 14 },
  48: { radius: 14, fontSize: 16 },
  56: { radius: 16, fontSize: 18 },
  64: { radius: 20, fontSize: 22 },
  72: { radius: 20, fontSize: 24 },
} as const

interface AvatarProps {
  initials: string
  size?: keyof typeof SIZES
  /** Tints the avatar by attention level; omit for the neutral purple. */
  status?: Status
  tone?: 'default' | 'onTint' | 'dark'
  className?: string
}

export function Avatar({ initials, size = 40, status, tone = 'default', className }: AvatarProps) {
  const { radius, fontSize } = SIZES[size]
  return (
    <span
      aria-hidden="true"
      data-status={tone === 'dark' ? undefined : status}
      className={cx(styles.avatar, tone === 'onTint' && styles.onTint, tone === 'dark' && styles.dark, className)}
      style={{ width: size, height: size, borderRadius: radius, fontSize }}
    >
      {initials}
    </span>
  )
}
