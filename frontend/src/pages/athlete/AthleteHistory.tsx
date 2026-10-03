import { useTitle } from '../../lib/useTitle'
import { useAthleteStore } from '../../state/athleteStore'
import styles from './athlete.module.css'

const LABELS = ['Sleep', 'Tiredness', 'Soreness', 'Feeling']

export function AthleteHistory() {
  useTitle('Your check-ins')
  const { snapshot } = useAthleteStore()
  if (!snapshot) return null
  const { history, feelingWeek } = snapshot

  return (
    <div className={styles.stack} style={{ gap: 18 }}>
      <div className={styles.heading}>
        <h1 className={styles.title}>Your check-ins</h1>
        <p className={styles.leadSmall}>What you’ve shared over the last week.</p>
      </div>
      <div className={styles.card}>
        <span className={styles.cardTitle}>How you’ve been feeling</span>
        <div
          className={styles.chart}
          role="img"
          aria-label={`Overall feeling, last ${feelingWeek.length} days: ${feelingWeek
            .map((d) => (d.value === null ? 'no check-in' : `${d.value} of 5`))
            .join(', ')}`}
        >
          {feelingWeek.map((d, i) => (
            <div
              key={i}
              className={styles.chartBar}
              data-latest={i === feelingWeek.length - 1}
              style={{ height: `${((d.value ?? 0) / 5) * 100}%` }}
            />
          ))}
        </div>
        <div className={styles.chartLabels} aria-hidden="true">
          {feelingWeek.map((d, i) => (
            <span key={i}>{d.day}</span>
          ))}
        </div>
      </div>
      {history.length === 0 && <p className={styles.muted}>Your check-ins will show up here.</p>}
      {history.map((d) => (
        <div key={d.label} className={styles.dayCard}>
          <span className={styles.dayName}>{d.label}</span>
          {d.values ? (
            <div className={styles.values}>
              {d.values.map((v, i) => (
                <div key={LABELS[i]} className={styles.value}>
                  <span className={styles.valueLabel}>{LABELS[i]}</span>
                  <span className={styles.valueNumber}>{v}/5</span>
                </div>
              ))}
            </div>
          ) : (
            <span className={styles.muted}>No daily check-in</span>
          )}
          {d.session && <span className={styles.daySession}>{d.session}</span>}
        </div>
      ))}
    </div>
  )
}
