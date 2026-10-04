import { useState } from 'react'
import { Link } from 'react-router'
import { Avatar } from '../../components/ui/Avatar'
import { Icon } from '../../components/ui/Icon'
import { Logo } from '../../components/ui/Logo'
import { SampleDataNote } from '../../components/ui/SampleDataNote'
import { DEMO_DATE } from '../../data/team'
import { cx } from '../../lib/cx'
import { useTitle } from '../../lib/useTitle'
import { paths, type CheckInFlow } from '../../navigation/paths'
import { useAthleteStore } from '../../state/athleteStore'
import styles from './athlete.module.css'

const ENTRIES: { flow: CheckInFlow; title: string; sub: string }[] = [
  { flow: 'daily', title: 'Daily check-in', sub: 'Due now · about 45 seconds' },
  { flow: 'post', title: 'Post-training check-in', sub: 'After training · about 1 minute' },
]

/** Weekday initials for the last 7 days, oldest first. */
function lastSevenLabels(today: Date): string[] {
  return Array.from({ length: 7 }, (_, i) =>
    new Date(today.getFullYear(), today.getMonth(), today.getDate() - (6 - i)).toLocaleDateString('en-US', {
      weekday: 'narrow',
    }),
  )
}

/** Consecutive days checked in, ending today (or yesterday while today is still open). */
function currentStreak(days: boolean[]): number {
  const counted = days[days.length - 1] ? days : days.slice(0, -1)
  let streak = 0
  for (let i = counted.length - 1; i >= 0 && counted[i]; i--) streak++
  return streak
}

export function AthleteHome() {
  useTitle('Athlete home')
  const { snapshot, dataSource } = useAthleteStore()
  const [today] = useState(() => (dataSource === 'api' ? new Date() : DEMO_DATE))
  if (!snapshot) return null
  const { profile, completed, lastSevenDays, coachFollowUp } = snapshot
  const streak = currentStreak(lastSevenDays)
  const labels = lastSevenLabels(today)

  return (
    <div className={styles.stack}>
      <Logo size={32} wordmarkSize={18} wordmark="plain" className={styles.phoneOnly} />
      <div className={styles.heading}>
        <h1 className={styles.title}>Good morning, {profile.firstName}</h1>
        <p className={styles.lead}>Two quick check-ins help your coach look out for you.</p>
      </div>

      {coachFollowUp && (
        <div className={styles.followUp}>
          <Avatar initials={profile.coachInitials} size={36} tone="dark" />
          <div className={styles.followUpText}>
            <span className={styles.followUpTitle}>{profile.coachName} would like a quick chat before training today.</span>
            <span className={styles.followUpSub}>Thanks for being honest in your check-in.</span>
          </div>
        </div>
      )}

      {ENTRIES.map((entry, i) => {
        const done = completed[entry.flow]
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
      <SampleDataNote>Sessions are sample data until the schedule API exists.</SampleDataNote>

      <div className={styles.card}>
        <span className={styles.cardTitle}>
          {streak}-day check-in streak
        </span>
        <div className={styles.week} aria-label={`Checked in on ${lastSevenDays.filter(Boolean).length} of the last 7 days`} role="img">
          {lastSevenDays.map((checkedIn, i) => (
            <span key={i} className={styles.day} data-done={checkedIn}>
              {labels[i]}
            </span>
          ))}
        </div>
      </div>

      <p className={styles.muted}>Your answers are shared with your coaching staff only.</p>
    </div>
  )
}
