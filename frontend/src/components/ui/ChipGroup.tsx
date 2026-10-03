import { cx } from '../../lib/cx'
import styles from './ChipGroup.module.css'
import { onTabListKeyDown } from './rovingTabs'

export interface ChipOption<T> {
  value: T
  label: string
  count?: number
}

interface ChipGroupProps<T> {
  options: readonly ChipOption<T>[]
  value: T
  onChange: (value: T) => void
  label: string
  /** "tabs" when the chips switch the content below; "toggle" for filters. */
  semantics?: 'toggle' | 'tabs'
  tone?: 'dark' | 'brand'
  size?: 'sm' | 'md'
}

export function ChipGroup<T extends string | number>({
  options,
  value,
  onChange,
  label,
  semantics = 'toggle',
  tone = 'dark',
  size = 'sm',
}: ChipGroupProps<T>) {
  const tabs = semantics === 'tabs'
  return (
    <div
      role={tabs ? 'tablist' : 'group'}
      aria-label={label}
      className={cx(styles.group, styles[size], tone === 'brand' && styles.brand)}
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
            key={String(o.value)}
            type="button"
            className={styles.chip}
            data-selected={selected}
            onClick={() => onChange(o.value)}
            {...(tabs
              ? { role: 'tab', 'aria-selected': selected, tabIndex: selected ? 0 : -1 }
              : { 'aria-pressed': selected })}
          >
            {o.label}
            {o.count !== undefined && <span className={styles.count}>{o.count}</span>}
          </button>
        )
      })}
    </div>
  )
}
