import { Link } from 'react-router'
import { Avatar } from '../../components/ui/Avatar'
import { Icon } from '../../components/ui/Icon'
import { Logo } from '../../components/ui/Logo'
import { ATHLETE_SELF } from '../../data/athleteApp'
import { TEAM } from '../../data/team'
import { cx } from '../../lib/cx'
import { useTitle } from '../../lib/useTitle'
import { paths, type CheckInFlow } from '../../navigation/paths'
import { useAthleteStore } from '../../state/athleteStore'
import { useCoachStore } from '../../state/coachStore'
import styles from './athlete.module.css'

const ENTRIES: { flow: CheckInFlow; title: string; sub: string }[] = [
  { flow: 'daily', title: 'Daily check-in', sub: 'Due now · about 45 seconds' },
  { flow: 'post', title: 'Post-training check-in', sub: 'After training · about 1 minute' },
]

const WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export function AthleteHome() {
  useTitle('Athlete home')
  const { completed } = useAthleteStore()
  const { athlete } = useCoachStore()
  // The coach is following up on today's reported symptoms.
  const followUp = athlete(ATHLETE_SELF.id)?.status === 'high'
  const streak = completed.daily ? 7 : 6

  return (
    <div className={styles.stack}>
      <Logo size={32} wordmarkSize={18} wordmark="plain" />
      <div className={styles.heading}>
        <h1 className={styles.title}>Good morning, {ATHLETE_SELF.firstName}</h1>
        <p className={styles.lead}>Two quick check-ins help your coach look out for you.</p>
      </div>

      {followUp && (
        <div className={styles.followUp}>
          <Avatar initials={TEAM.coach.initials} size={36} tone="dark" />
          <div className={styles.followUpText}>
            <span className={styles.followUpTitle}>{TEAM.coach.shortName} would like a quick chat before training today.</span>
            <span className={styles.followUpSub}>Thanks for being honest in your check-in.</span>
          </div>
        </div>
      )}

      {ENTRIES.map((entry, i) => {
        const done = Boolean(completed[entry.flow])
        const content = (
          <>
            <span className={styles.entryText}>
              <span className={styles.entryTitle}>{entry.title}</span>
              <span className={styles.entrySub}>{done ? 'Done for today — thank you' : entry.sub}</span>
            </span>
            <span className={styles.entryChip}>
              {done ? (
                <Icon name="done" size={16} />
              ) : (
                <span className={styles.forward}>
                  <Icon name="back" size={16} />
                </span>
              )}
            </span>
          </>
        )
        return done ? (
          <div key={entry.flow} className={styles.entry} data-done="true">
            {content}
          </div>
        ) : (
          <Link key={entry.flow} to={paths.athleteApp.checkIn(entry.flow)} className={styles.entry} data-primary={i === 0}>
            {content}
          </Link>
        )
      })}

      <div className={cx(styles.card, styles.session)}>
        <span className={styles.sessionIcon}>
          <Icon name="calendar" size={20} />
        </span>
        <div className={styles.sessionText}>
          <span className={styles.sessionLabel}>Today’s session</span>
          <span className={styles.sessionTitle}>Training · 4:30 PM</span>
          <span className={styles.sessionMeta}>Northside Park, Pitch 2 · 90 min</span>
        </div>
      </div>

      <div className={styles.card}>
        <span className={styles.cardTitle}>{streak}-day check-in streak</span>
        <div className={styles.week} aria-label={`Checked in ${streak} of the last 7 days`} role="img">
          {WEEK.map((d, i) => (
            <span key={i} className={styles.day} data-done={i < 6 || Boolean(completed.daily)}>
              {d}
            </span>
          ))}
        </div>
      </div>

      <p className={styles.muted}>Your answers are shared with your coaching staff only.</p>
    </div>
  )
}
