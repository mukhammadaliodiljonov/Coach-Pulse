import { SCHEDULE } from '../../data/athleteApp'
import { useTitle } from '../../lib/useTitle'
import styles from './athlete.module.css'

export function AthleteSchedule() {
  useTitle('Schedule')
  return (
    <div className={styles.stack} style={{ gap: 14 }}>
      <div className={styles.heading}>
        <h1 className={styles.title}>Schedule</h1>
        <p className={styles.leadSmall}>Post-training check-in opens after each session.</p>
      </div>
      <ul className={styles.list}>
        {SCHEDULE.map((s, i) => (
          <li key={s.day} className={styles.slot} data-today={i === 0}>
            <span className={styles.slotDay}>{s.day}</span>
            <span className={styles.slotText}>
              <span className={styles.slotTitle}>{s.title}</span>
              <span className={styles.slotMeta}>{s.time}</span>
              <span className={styles.slotMeta}>{s.place}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
