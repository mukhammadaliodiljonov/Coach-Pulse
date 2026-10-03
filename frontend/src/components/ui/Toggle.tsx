import styles from './Toggle.module.css'

interface ToggleProps {
  checked: boolean
  onChange: () => void
  label: string
}

export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className={styles.track} onClick={onChange}>
      <span className={styles.knob} />
    </button>
  )
}
