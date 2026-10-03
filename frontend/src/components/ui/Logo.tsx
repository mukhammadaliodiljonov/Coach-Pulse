import { cx } from '../../lib/cx'
import styles from './Logo.module.css'

interface LogoMarkProps {
  size?: number
  /** White tile with a purple pulse, for purple backgrounds. */
  inverted?: boolean
}

export function LogoMark({ size = 34, inverted = false }: LogoMarkProps) {
  const glyph = Math.round(size * 0.6)
  return (
    <span
      className={cx(styles.mark, inverted && styles.inverted)}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.31) }}
      aria-hidden="true"
    >
      <svg width={glyph} height={glyph} viewBox="0 0 24 24" fill="none">
        <path
          d="M2 13h4.5l2.5-6 4 11 3-8 1.5 3H22"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

interface LogoProps extends LogoMarkProps {
  wordmarkSize?: number
  /** "split" colours "Pulse" purple; "plain" uses one colour (inherits on purple panels). */
  wordmark?: 'split' | 'plain'
  className?: string
  wordmarkClassName?: string
}

export function Logo({ size = 34, inverted, wordmarkSize = 19, wordmark = 'split', className, wordmarkClassName }: LogoProps) {
  return (
    <span className={cx(styles.logo, className)}>
      <LogoMark size={size} inverted={inverted} />
      <span
        className={cx(styles.wordmark, wordmarkClassName)}
        style={{ fontSize: wordmarkSize, color: wordmark === 'plain' ? 'inherit' : undefined }}
      >
        Coach{wordmark === 'split' ? <span className={styles.accent}>Pulse</span> : 'Pulse'}
      </span>
    </span>
  )
}
