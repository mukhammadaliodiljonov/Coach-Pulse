import { cx } from '../../lib/cx'
import styles from './Button.module.css'

export type ButtonVariant = 'primary' | 'outline' | 'white' | 'ghost'
export type ButtonSize = 'lg' | 'md' | 'sm'

export interface ButtonLook {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
}

export function buttonClass({ variant = 'primary', size = 'lg', fullWidth }: ButtonLook, extra?: string): string {
  return cx(styles.button, styles[variant], styles[size], fullWidth && styles.full, extra)
}
