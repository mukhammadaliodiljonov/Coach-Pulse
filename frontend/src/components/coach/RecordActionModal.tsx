import { useState, type FormEvent } from 'react'
import { describeError } from '../../api/client'
import type { Athlete, CoachAction } from '../../domain/types'
import { useCoachStore } from '../../state/coachStore'
import ui from '../../styles/ui.module.css'
import { ActionChoice } from '../ui/ActionChoice'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { Modal } from '../ui/Modal'
import styles from './RecordActionModal.module.css'

const TITLE_ID = 'record-action-title'

export function RecordActionModal() {
  const { actionTarget, closeRecordAction } = useCoachStore()
  return (
    <Modal open={actionTarget !== null} onClose={closeRecordAction} labelledBy={TITLE_ID}>
      {actionTarget && <RecordActionForm key={actionTarget.id} athlete={actionTarget} />}
    </Modal>
  )
}

function RecordActionForm({ athlete }: { athlete: Athlete }) {
  const { recordAction, closeRecordAction, prefs } = useCoachStore()
  const [choice, setChoice] = useState<CoachAction | null>(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // On success the store closes the dialog; on failure it stays open with the notes intact.
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!choice || saving) return
    setSaving(true)
    setError(null)
    try {
      await recordAction(athlete.id, choice, notes)
    } catch (err) {
      setError(`Couldn’t save the action. ${describeError(err)}`)
      setSaving(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <div className={styles.header}>
        <div className={styles.heading}>
          <h2 id={TITLE_ID} className={styles.title}>
            Record action
          </h2>
          <span className={styles.subtitle}>
            {athlete.name} · {athlete.reason}
          </span>
        </div>
        <button type="button" className={styles.close} aria-label="Close" onClick={closeRecordAction}>
          <Icon name="close" size={18} />
        </button>
      </div>
      {prefs.guardianPrompt && athlete.status === 'high' && (
        <p className={styles.prompt}>Your escalation settings suggest contacting {athlete.firstName}’s parent or guardian.</p>
      )}
      <ActionChoice value={choice} onChange={setChoice} />
      <label className={ui.field}>
        Add notes
        <textarea
          className={ui.textarea}
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What happened, who was involved, next check."
        />
      </label>
      <p className={styles.hint}>Saved with your name and time to the athlete’s follow-up history.</p>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.actions}>
        <Button variant="ghost" size="md" onClick={closeRecordAction}>
          Cancel
        </Button>
        <Button type="submit" size="md" disabled={!choice || saving}>
          {saving ? 'Saving…' : 'Save action'}
        </Button>
      </div>
    </form>
  )
}
