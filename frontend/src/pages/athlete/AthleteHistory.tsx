import { FEELING_WEEK, HISTORY, SAMPLE_TODAY } from '../../data/athleteApp'
import { useTitle } from '../../lib/useTitle'
import { useAthleteStore } from '../../state/athleteStore'
import styles from './athlete.module.css'

const LABELS = ['Sleep', 'Tiredness', 'Soreness', 'Feeling']

export function AthleteHistory() {
  useTitle('Your check-ins')
  const { todayAnswers } = useAthleteStore()
  const today: [number, number, number, number] = todayAnswers
    ? [todayAnswers.sleep, todayAnswers.fatigue, todayAnswers.soreness, todayAnswers.wellness]
    : SAMPLE_TODAY
  const days = [{ day: 'Today', values: today, session: undefined }, ...HISTORY]

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
          aria-label={`Overall feeling, last 7 days: ${FEELING_WEEK.map((d) => `${d.value} of 5`).join(', ')}`}
        >
          {FEELING_WEEK.map((d, i) => (
            <div
              key={i}
              className={styles.chartBar}
              data-latest={i === FEELING_WEEK.length - 1}
              style={{ height: `${(d.value / 5) * 100}%` }}
            />
          ))}
        </div>
        <div className={styles.chartLabels} aria-hidden="true">
          {FEELING_WEEK.map((d, i) => (
            <span key={i}>{d.day}</span>
          ))}
        </div>
      </div>
      {days.map((d) => (
        <div key={d.day} className={styles.dayCard}>
          <span className={styles.dayName}>{d.day}</span>
          <div className={styles.values}>
            {d.values.map((v, i) => (
              <div key={LABELS[i]} className={styles.value}>
                <span className={styles.valueLabel}>{LABELS[i]}</span>
                <span className={styles.valueNumber}>{v}/5</span>
              </div>
            ))}
          </div>
          {d.session && <span className={styles.daySession}>{d.session}</span>}
        </div>
      ))}
    </div>
  )
}
