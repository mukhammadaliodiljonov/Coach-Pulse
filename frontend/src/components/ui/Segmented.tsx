import { cx } from '../../lib/cx'
import { onTabListKeyDown } from './rovingTabs'
import styles from './Segmented.module.css'

interface SegmentedProps<T extends string> {
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  label: string
  /** "tabs" switches content in place; "toggle" is a pressed-button group (e.g. table vs cards). */
  variant?: 'tabs' | 'toggle'
}

export function Segmented<T extends string>({ options, value, onChange, label, variant = 'tabs' }: SegmentedProps<T>) {
  const tabs = variant === 'tabs'
  return (
    <div
      role={tabs ? 'tablist' : 'group'}
      aria-label={label}
      className={cx(styles.group, styles[variant])}
      onKeyDown={
        tabs
          ? (e) =>
              onTabListKeyDown(
                e,
                options.map((o) => o.value),
                value,
                onChange,
              )
          : undefined
      }
    >
      {options.map((o) => {
        const selected = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            className={styles.option}
            onClick={() => onChange(o.value)}
            {...(tabs
              ? { role: 'tab', 'aria-selected': selected, tabIndex: selected ? 0 : -1 }
              : { 'aria-pressed': selected })}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
