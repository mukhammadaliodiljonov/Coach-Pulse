import { useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { Icon } from './Icon'
import type { IconName } from './iconPaths'
import styles from './Input.module.css'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: 'outline' | 'filled'
  leftIcon?: IconName
  /** Rendered after the input, e.g. a send button. Ignored for passwords. */
  trailing?: ReactNode
  shellClassName?: string
}

export function Input({ variant = 'outline', leftIcon, trailing, shellClassName, className, type = 'text', ...rest }: InputProps) {
  const [revealed, setRevealed] = useState(false)
  const isPassword = type === 'password'
  return (
    <div className={cx(styles.shell, variant === 'filled' && styles.filled, shellClassName)}>
      {leftIcon && (
        <span className={styles.leftIcon}>
          <Icon name={leftIcon} size={22} />
        </span>
      )}
      <input type={isPassword && revealed ? 'text' : type} className={cx(styles.input, className)} {...rest} />
      {isPassword ? (
        <button
          type="button"
          className={styles.trailing}
          onClick={() => setRevealed((r) => !r)}
          aria-label={revealed ? 'Hide password' : 'Show password'}
          aria-pressed={revealed}
        >
          <Icon name={revealed ? 'visibility_on' : 'visibility_off'} size={22} />
        </button>
      ) : (
        trailing
      )}
    </div>
  )
}
