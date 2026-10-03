import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { Input } from '../../components/ui/Input'
import { TEAM } from '../../data/team'
import { useTitle } from '../../lib/useTitle'
import { paths } from '../../navigation/paths'
import { useAthleteStore } from '../../state/athleteStore'
import styles from './athlete.module.css'

export function AthleteJoin() {
  useTitle('Join a team')
  const { signIn } = useAthleteStore()
  const navigate = useNavigate()
  const [code, setCode] = useState<string>(TEAM.code)
  const [confirming, setConfirming] = useState(false)

  return (
    <div className={styles.scroll}>
      <div className={styles.join}>
        <button
          type="button"
          className={styles.backButton}
          aria-label="Back"
          onClick={() => (confirming ? setConfirming(false) : navigate(paths.athleteApp.login))}
        >
          <Icon name="back" size={14} />
        </button>
        {!confirming ? (
          <>
            <div className={styles.heading}>
              <h1 className={styles.stepTitle}>Enter your team code</h1>
              <p className={styles.lead}>Ask your coach if you don’t have one.</p>
            </div>
            <Input
              aria-label="Team code"
              placeholder={TEAM.code}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className={styles.codeInput}
              autoCapitalize="characters"
            />
            <div className={styles.grow} />
            <Button fullWidth disabled={code.trim().length < 4} onClick={() => setConfirming(true)}>
              Continue
            </Button>
          </>
        ) : (
          <>
            <div className={styles.heading}>
              <h1 className={styles.stepTitle}>Join this team?</h1>
            </div>
            <div className={styles.teamCard}>
              <span className={styles.teamName}>{TEAM.name}</span>
              <span>
                {TEAM.sport} · Coach {TEAM.coach.name}
              </span>
            </div>
            <div className={styles.visibility}>
              <span className={styles.visibilityTitle}>What your coaching staff will see</span>
              <span className={styles.infoText}>
                Your check-in answers (sleep, tiredness, soreness, how you feel), training effort and any symptoms you
                report. Nothing else on your phone.
              </span>
            </div>
            <div className={styles.grow} />
            <Button
              fullWidth
              onClick={() => {
                signIn()
                navigate(paths.athleteApp.home)
              }}
            >
              Join team
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
