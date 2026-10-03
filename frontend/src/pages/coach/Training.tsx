import { useState } from 'react'
import { Link } from 'react-router'
import { Avatar } from '../../components/ui/Avatar'
import { ChipGroup } from '../../components/ui/ChipGroup'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { SampleDataNote } from '../../components/ui/SampleDataNote'
import { SESSIONS, sessionRows } from '../../data/sessions'
import { cx } from '../../lib/cx'
import { useTitle } from '../../lib/useTitle'
import { paths, useProfileLinkState } from '../../navigation/paths'
import { useCoachStore } from '../../state/coachStore'
import ui from '../../styles/ui.module.css'
import styles from './Training.module.css'

export function Training() {
  useTitle('Training session')
  const { roster, team, teamInfo } = useCoachStore()
  const linkState = useProfileLinkState()
  const [sessionId, setSessionId] = useState(SESSIONS[0].id)
  const session = SESSIONS.find((s) => s.id === sessionId) ?? SESSIONS[0]
  const rows = sessionRows(session, roster)

  const average = (pick: (r: (typeof rows)[number]) => number) =>
    rows.length ? rows.reduce((sum, r) => sum + pick(r), 0) / rows.length : null
  const avgRpe = average((r) => r.rpe)
  const avgLoad = average((r) => r.load)
  const avgDuration = average((r) => r.durationMin)
  const flagged = rows.filter((r) => r.status !== 'normal').length

  const fields = [
    { label: 'Date', value: session.date },
    { label: 'Duration', value: avgDuration === null ? '—' : `${Math.round(avgDuration)} min` },
    { label: 'Training type', value: session.type },
    { label: 'Team', value: teamInfo.name },
  ]
  const summary = [
    { label: 'Athletes checked in', value: session.checkedIn ?? `${team.checkedIn} / ${team.size}`, unit: '' },
    { label: 'Average RPE', value: avgRpe === null ? '—' : avgRpe.toFixed(1), unit: ' / 10' },
    { label: 'Average training load', value: avgLoad === null ? '—' : String(Math.round(avgLoad)), unit: ' AU' },
    { label: 'Athletes flagged', value: String(flagged), unit: '', tone: flagged ? 'review' : undefined },
  ]

  return (
    <div className={ui.page}>
      <header className={ui.pageHeader}>
        <div className={ui.pageHeading}>
          <h1 className={ui.pageTitle}>Training session</h1>
          <p className={ui.pageLead}>Load is estimated from each athlete’s session duration × RPE.</p>
        </div>
        <ChipGroup
          label="Session"
          value={sessionId}
          onChange={setSessionId}
          options={SESSIONS.map((s) => ({ value: s.id, label: s.chip }))}
        />
      </header>
      <SampleDataNote>
        Sessions are sample data until the sessions API exists; the latest session uses athletes’ real post-training
        check-ins.
      </SampleDataNote>

      <section aria-label="Session details" className={cx(ui.card, styles.fields)}>
        {fields.map((f) => (
          <div key={f.label} className={styles.field}>
            <span className={ui.tileLabel}>{f.label}</span>
            <span className={styles.fieldValue}>{f.value}</span>
          </div>
        ))}
      </section>

      <section aria-labelledby="summary-title" className={styles.section}>
        <h2 id="summary-title" className={ui.sectionTitle}>
          Session summary
        </h2>
        <div className={styles.summary}>
          {summary.map((m) => (
            <div key={m.label} className={styles.summaryTile}>
              <span className={styles.summaryLabel}>{m.label}</span>
              <span className={styles.summaryValue} data-tone={m.tone}>
                {m.value}
                <span className={styles.summaryUnit}>{m.unit}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="attention-title" className={cx(ui.card, styles.list)}>
        <h2 id="attention-title" className={cx(ui.sectionTitle, styles.listTitle)}>
          Athletes by attention level
        </h2>
        {rows.length === 0 ? (
          <p className={styles.empty}>No post-session check-ins yet.</p>
        ) : (
          <ul className={styles.rows}>
            {rows.map((r) => (
              <li key={r.athlete.id}>
                <Link to={paths.athlete(r.athlete.id)} state={linkState} className={styles.row}>
                  <Avatar initials={r.athlete.initials} size={36} status={r.status} />
                  <span className={styles.who}>
                    <span className={styles.name}>{r.athlete.name}</span>
                    <span className={styles.reason}>{r.reason}</span>
                  </span>
                  <StatusBadge status={r.status} size="sm" />
                  <span className={styles.numbers}>
                    <span className={styles.number}>
                      <span className={styles.numberLabel}>Duration</span>
                      {r.durationMin} min
                    </span>
                    <span className={styles.number}>
                      <span className={styles.numberLabel}>RPE</span>
                      {r.rpe} / 10
                    </span>
                    <span className={styles.number}>
                      <span className={styles.numberLabel}>Load</span>
                      {r.load} AU
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
