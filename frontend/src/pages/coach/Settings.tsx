import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Toggle } from '../../components/ui/Toggle'
import { TEAM } from '../../data/team'
import { cx } from '../../lib/cx'
import { useTitle } from '../../lib/useTitle'
import { paths } from '../../navigation/paths'
import { useCoachStore, type CoachPrefs } from '../../state/coachStore'
import ui from '../../styles/ui.module.css'
import styles from './Settings.module.css'

const ESCALATION: { key: keyof CoachPrefs; label: string; sub: string }[] = [
  { key: 'symptomImmediate', label: 'Notify me immediately when a safety symptom is reported', sub: 'Push + email, any time of day' },
  { key: 'welfareOfficer', label: 'Also notify the club welfare officer', sub: TEAM.welfareEmail },
  { key: 'guardianPrompt', label: 'Prompt me to contact the parent/guardian', sub: 'Shown as a step in the action dialog' },
]

const CHANNELS: { key: keyof CoachPrefs; label: string; sub: string }[] = [
  { key: 'email', label: 'Email', sub: 'Daily summary at 7:45 AM' },
  { key: 'dashboard', label: 'Dashboard', sub: 'Badges and the notification center' },
  { key: 'push', label: 'Push', sub: 'High priority and team patterns only' },
  { key: 'weeklyDigest', label: 'Weekly digest', sub: 'Monday morning team report' },
]

export function Settings() {
  useTitle('Settings')
  const { prefs, togglePref, showToast } = useCoachStore()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [protocol, setProtocol] = useState({
    name: 'Northside FC welfare & head-injury protocol',
    meta: 'v2 · uploaded Aug 14, 2026 · linked from every high-priority alert',
  })

  const toggleRows = (rows: typeof ESCALATION) =>
    rows.map((row) => (
      <div key={row.key} className={styles.toggleRow}>
        <div className={styles.toggleText}>
          <span className={styles.toggleLabel}>{row.label}</span>
          <span className={styles.toggleSub}>{row.sub}</span>
        </div>
        <Toggle checked={prefs[row.key]} onChange={() => togglePref(row.key)} label={row.label} />
      </div>
    ))

  return (
    <div className={cx(ui.page, ui.pageNarrow)}>
      <header className={ui.pageHeading}>
        <h1 className={ui.pageTitle}>Settings</h1>
      </header>

      <section aria-labelledby="team-title" className={ui.card} style={{ gap: 16 }}>
        <h2 id="team-title" className={ui.sectionTitle}>
          Team
        </h2>
        <div className={styles.teamFields}>
          <label className={cx(ui.field, styles.label)}>
            Team name
            <Input defaultValue={TEAM.name} />
          </label>
          <label className={cx(ui.field, styles.label)}>
            Sport
            <Input defaultValue={TEAM.sport} />
          </label>
          <label className={cx(ui.field, styles.label)}>
            Age group
            <Input defaultValue={TEAM.ageGroup} />
          </label>
        </div>
      </section>

      <section aria-labelledby="safety-title" className={ui.card} style={{ gap: 12 }}>
        <h2 id="safety-title" className={ui.sectionTitle}>
          Safety
        </h2>
        <div className={styles.protocol}>
          <div className={styles.protocolText}>
            <span className={ui.tileLabel}>Organization safety rules</span>
            <span className={styles.protocolName}>{protocol.name}</span>
            <span className={styles.protocolMeta}>{protocol.meta}</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
            Replace document
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx"
            className={styles.fileInput}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              setProtocol({ name: file.name, meta: 'Selected today · uploads once the server is connected' })
              showToast('Protocol document selected')
            }}
          />
        </div>
        <span className={styles.subhead}>Escalation preferences</span>
        <div>{toggleRows(ESCALATION)}</div>
      </section>

      <section aria-labelledby="notifications-title" className={ui.card} style={{ gap: 4 }}>
        <h2 id="notifications-title" className={ui.sectionTitle} style={{ marginBottom: 8 }}>
          Notifications
        </h2>
        <div>{toggleRows(CHANNELS)}</div>
      </section>

      <section aria-labelledby="account-title" className={ui.card}>
        <h2 id="account-title" className={ui.sectionTitle}>
          Account
        </h2>
        <div className={styles.account}>
          <Avatar initials={TEAM.coach.initials} size={48} tone="dark" />
          <div className={styles.accountText}>
            <span className={styles.accountName}>{TEAM.coach.name}</span>
            <span className={styles.accountMeta}>
              {TEAM.coach.role} · {TEAM.coach.email}
            </span>
          </div>
          <Button size="sm" variant="outline">
            Edit profile
          </Button>
          <Button size="sm" variant="outline">
            Change password
          </Button>
          <Button size="sm" variant="ghost" onClick={() => navigate(paths.login)}>
            Log out
          </Button>
        </div>
      </section>

      <div className={styles.save}>
        <Button size="md" onClick={() => showToast('Settings saved')}>
          Save changes
        </Button>
      </div>
    </div>
  )
}
