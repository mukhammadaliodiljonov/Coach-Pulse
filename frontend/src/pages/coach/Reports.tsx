import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { SampleDataNote } from '../../components/ui/SampleDataNote'
import { buildReport, REPORT_PERIOD, REPORT_TYPES, type ReportKind } from '../../data/reports'
import { cx } from '../../lib/cx'
import { downloadFile, toCsv } from '../../lib/download'
import { useTitle } from '../../lib/useTitle'
import { useCoachStore } from '../../state/coachStore'
import ui from '../../styles/ui.module.css'
import styles from './Reports.module.css'

export function Reports() {
  useTitle('Reports')
  const { roster, team, teamInfo, actions, audit, showToast } = useCoachStore()
  const [kind, setKind] = useState<ReportKind>('weekly')
  const type = REPORT_TYPES.find((t) => t.kind === kind) ?? REPORT_TYPES[0]
  const report = buildReport(kind, { roster, flagged: team.flagged, actions, audit })

  const exportCsv = () => {
    const slug = type.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    downloadFile(`coachpulse-${slug}-2026-09-28.csv`, toCsv([report.columns, ...report.rows]), 'text/csv;charset=utf-8')
    showToast('CSV downloaded')
  }

  return (
    <div className={ui.page}>
      <header className={ui.pageHeading}>
        <h1 className={ui.pageTitle}>Reports</h1>
        <p className={ui.pageLead}>Share with your club, welfare officer or parents.</p>
      </header>
      <SampleDataNote>
        Weekly figures are sample data until the reports API exists; alerts, actions and the roster are real.
      </SampleDataNote>
      <div className={styles.layout}>
        <div className={styles.types} role="group" aria-label="Report type">
          {REPORT_TYPES.map((t) => (
            <button key={t.kind} type="button" className={styles.type} aria-pressed={t.kind === kind} onClick={() => setKind(t.kind)}>
              <span className={styles.typeTitle}>{t.title}</span>
              <span className={styles.typeDescription}>{t.description}</span>
            </button>
          ))}
        </div>

        <section aria-label="Report preview" className={cx(ui.card, styles.preview)} data-print-area>
          <div className={styles.previewHead}>
            <div className={styles.previewTitle}>
              <span className={styles.period}>
                {teamInfo.name} · {REPORT_PERIOD}
              </span>
              <h2 className={styles.title}>{type.title}</h2>
            </div>
            <div className={styles.buttons} data-print-hide>
              <Button size="sm" onClick={() => showToast('Report generated for Sep 28 – Oct 4')}>
                Generate report
              </Button>
              <Button size="sm" variant="outline" onClick={() => window.print()}>
                Export PDF
              </Button>
              <Button size="sm" variant="outline" onClick={exportCsv}>
                Export CSV
              </Button>
            </div>
          </div>
          <div className={styles.stats}>
            {report.stats.map((s) => (
              <div key={s.label} className={ui.tile}>
                <span className={ui.tileLabel}>{s.label}</span>
                <span className={styles.statValue}>{s.value}</span>
              </div>
            ))}
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {report.columns.map((c) => (
                    <th key={c} scope="col">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.footnote}>
            Reports summarise athlete-reported information and recorded coach actions. They are not medical records.
          </p>
        </section>
      </div>
    </div>
  )
}
