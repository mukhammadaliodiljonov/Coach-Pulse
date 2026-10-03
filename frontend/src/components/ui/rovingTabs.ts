import type { KeyboardEvent } from 'react'

/** Arrow-key selection for a tablist: moves selection and focus to the neighbouring tab. */
export function onTabListKeyDown<T>(event: KeyboardEvent<HTMLElement>, values: readonly T[], current: T, select: (value: T) => void) {
  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key]
  if (!step) return
  event.preventDefault()
  const next = (values.indexOf(current) + step + values.length) % values.length
  select(values[next])
  const tabs = event.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]')
  tabs[next]?.focus()
}
