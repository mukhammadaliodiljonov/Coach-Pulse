import { Link, useParams } from 'react-router'
import { AuditFeed } from '../../components/ui/AuditFeed'
import { Avatar } from '../../components/ui/Avatar'
import { Button, ButtonLink } from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { alertTimeLabel } from '../../domain/alerts'
import { cx } from '../../lib/cx'
import { useTitle } from '../../lib/useTitle'
import { paths } from '../../navigation/paths'
import { useCoachStore } from '../../state/coachStore'
import ui from '../../styles/ui.module.css'
import styles from './AlertDetail.module.css'

export function AlertDetail() {
  const { athleteId } = useParams()
  const { athlete, audit, openRecordAction } = useCoachStore()
  const a = athlete(athleteId)
  useTitle(a ? `Alert · ${a.name}` : 'Alert not found')

  const breadcrumb = (
    <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
      <ol>
        <li>
          <Link to={paths.alerts}>Alerts</Link>
        </li>
        <li aria-hidden="true">/</li>
        <li className={styles.current} aria-current="page">
          {a?.name ?? 'Not found'}
        </li>
      </ol>
    </nav>
  )

  if (!a || a.status === 'normal') {
    return (
      <div className={cx(ui.page, ui.pageNarrow)}>
        {breadcrumb}
        <div className={ui.empty}>
          <span className={ui.emptyTitle}>{a ? `No open alert for ${a.name}` : 'Alert not found'}</span>
          <span className={ui.emptyText}>
            {a ? `${a.firstName} is within their usual range today.` : 'The link may be out of date.'}
          </span>
          <ButtonLink to={a ? paths.athlete(a.id) : paths.alerts} size="md" variant="outline">
            {a ? 'View profile' : 'Back to alerts'}
          </ButtonLink>
        </div>
      </div>
    )
  }

  return (
    <div className={cx(ui.page, ui.pageNarrow)}>
      {breadcrumb}
      <header className={styles.header} data-status={a.status}>
        <div className={styles.headerBand}>
          <Avatar initials={a.initials} size={56} status={a.status} tone="onTint" />
          <div className={styles.identity}>
            <h1 className={styles.name}>{a.name}</h1>
            <span className={styles.meta}>
              {a.position ?? 'Athlete'} · Detected {alertTimeLabel(a).replace('Today', 'today')}
            </span>
          </div>
          <StatusBadge status={a.status} size="lg" />
        </div>
        {/* Never a diagnosis: describe what was reported, not what it means. */}
        <p className={styles.headline}>{a.status === 'high' ? 'Reported symptoms require review.' : a.reason}</p>
      </header>

      <section aria-labelledby="triggered-title" className={styles.section}>
        <h2 id="triggered-title" className={ui.cardTitle}>
          Why was this triggered?
        </h2>
        <div className={styles.signals}>
          {a.signals.map((s) => (
            <div key={s.kind} className={styles.signal} data-level={s.level}>
              <div className={styles.kindRow}>
                <StatusBadge status={s.level} iconOnly iconSize={18} />
                <span className={styles.kind}>{s.kind}</span>
              </div>
              <span className={styles.signalTitle}>{s.title}</span>
              {s.compare.map((c) => (
                <div key={c.metric} className={styles.compare}>
                  <div className={styles.compareTile} data-now="true">
                    <div className={styles.compareLabel}>{c.metric} now</div>
                    <div className={styles.compareValue}>{c.current}</div>
                  </div>
                  <div className={styles.compareTile}>
                    <div className={styles.compareLabel}>{c.baselineLabel}</div>
                    <div className={styles.compareValue}>{c.baseline}</div>
                  </div>
                </div>
              ))}
              <span className={styles.note}>{s.note}</span>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="next-title" className={styles.nextStep}>
        <h2 id="next-title" className={styles.nextTitle}>
          Suggested next step
        </h2>
        <p className={styles.nextText}>{a.nextStep}</p>
        <p className={styles.nextNote}>
          CoachPulse highlights changes from usual patterns. It does not diagnose conditions or decide whether an athlete
          can play.
        </p>
        <div className={styles.buttons}>
          <Button size="md" onClick={() => openRecordAction(a.id)}>
            Record action
          </Button>
          <ButtonLink size="md" variant="white" to={paths.athlete(a.id)} state={{ from: 'alert' }}>
            View full profile
          </ButtonLink>
        </div>
      </section>

      <section aria-labelledby="audit-title" className={ui.card} style={{ gap: 4 }}>
        <h2 id="audit-title" className={ui.sectionTitle} style={{ marginBottom: 10 }}>
          Audit trail
        </h2>
        <AuditFeed entries={audit.filter((e) => e.athleteId === a.id)} compact />
      </section>
    </div>
  )
}
