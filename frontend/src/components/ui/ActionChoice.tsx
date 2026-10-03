import { useId } from 'react'
import { COACH_ACTIONS, type CoachAction } from '../../domain/types'
import { cx } from '../../lib/cx'
import ui from '../../styles/ui.module.css'
import styles from './ActionChoice.module.css'

interface ActionChoiceProps {
  value: CoachAction | null
  onChange: (action: CoachAction) => void
  layout?: 'list' | 'grid'
}

/** The coach actions as a native radio group. */
export function ActionChoice({ value, onChange, layout = 'list' }: ActionChoiceProps) {
  const name = useId()
  return (
    <fieldset className={styles.fieldset}>
      <legend className={ui.srOnly}>Action taken</legend>
      <div className={cx(styles.options, layout === 'grid' && styles.grid)}>
        {COACH_ACTIONS.map((action) => (
          <label key={action} className={styles.option} data-selected={value === action}>
            <input
              type="radio"
              name={name}
              value={action}
              checked={value === action}
              onChange={() => onChange(action)}
              className={styles.input}
            />
            <span className={styles.ring} aria-hidden="true">
              <span className={styles.dot} />
            </span>
            {action}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
