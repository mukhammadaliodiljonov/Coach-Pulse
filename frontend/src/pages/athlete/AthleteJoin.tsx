import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { describeFormError } from '../../api/client'
import { api } from '../../api/endpoints'
import type { TeamPreviewDto } from '../../api/types'
import { useAuth } from '../../auth/useAuth'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { Input } from '../../components/ui/Input'
import { SampleDataNote } from '../../components/ui/SampleDataNote'
import { TEAM } from '../../data/team'
import { useTitle } from '../../lib/useTitle'
import { paths } from '../../navigation/paths'
import { useAthleteStore } from '../../state/athleteStore'
import ui from '../../styles/ui.module.css'
import styles from './athlete.module.css'

/** What the confirm step shows: the team the code belongs to. */
interface JoinTarget {
  name: string
  sport: string
  coach: string | null
}

const SAMPLE_TARGET: JoinTarget = { name: TEAM.name, sport: TEAM.sport, coach: TEAM.coach.name }

const toTarget = (team: TeamPreviewDto): JoinTarget => ({
  name: team.name,
  sport: team.sport,
  coach: team.headCoach ? `${team.headCoach.firstName} ${team.headCoach.lastName}` : null,
})

/**
 * Athletes join their coach's team with its code. With the backend, the code is checked first, then the
 * athlete creates their account on that team (the only way to get an athlete account) and is signed in.
 * With sample data it opens the demo athlete.
 */
export function AthleteJoin() {
  useTitle('Join a team')
  const { signIn: demoSignIn } = useAthleteStore()
  const auth = useAuth()
  const backend = auth.required
  const navigate = useNavigate()
  const [code, setCode] = useState<string>(backend ? '' : TEAM.code)
  const [target, setTarget] = useState<JoinTarget | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkCode = async () => {
    if (!backend) return setTarget(SAMPLE_TARGET)
    setBusy(true)
    setError(null)
    try {
      setTarget(toTarget(await api.previewTeam(code)))
    } catch (e) {
      setError(describeFormError(e))
    } finally {
      setBusy(false)
    }
  }

  const join = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!backend) {
      void demoSignIn()
      return navigate(paths.athleteApp.home)
    }
    const form = new FormData(event.currentTarget)
    const value = (name: string) => String(form.get(name) ?? '').trim()
    const email = value('email')
    const password = String(form.get('password') ?? '')
    setBusy(true)
    setError(null)
    try {
      await api.joinTeam({ joinCode: code, email, password, firstName: value('firstName'), lastName: value('lastName') })
      await auth.signIn(email, password)
      navigate(paths.athleteApp.home, { replace: true })
    } catch (e) {
      setError(describeFormError(e))
      setBusy(false)
    }
  }

  const back = () => {
    setError(null)
    if (target) setTarget(null)
    else navigate(paths.athleteApp.login)
  }

  return (
    <div className={styles.scroll}>
      <div className={styles.join}>
        <button type="button" className={styles.backButton} aria-label="Back" onClick={back}>
          <Icon name="back" size={14} />
        </button>
        {!backend && <SampleDataNote>Joining with a code isn’t connected to the server yet.</SampleDataNote>}
        {!target ? (
          <form
            className={styles.join}
            onSubmit={(e) => {
              e.preventDefault()
              void checkCode()
            }}
          >
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
              autoComplete="off"
            />
            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
            <div className={styles.grow} />
            <Button type="submit" fullWidth disabled={busy || code.trim().length < 4}>
              {busy ? 'Checking…' : 'Continue'}
            </Button>
          </form>
        ) : (
          <form className={styles.join} onSubmit={(e) => void join(e)}>
            <div className={styles.heading}>
              <h1 className={styles.stepTitle}>Join this team?</h1>
            </div>
            <div className={styles.teamCard}>
              <span className={styles.teamName}>{target.name}</span>
              <span>
                {target.sport}
                {target.coach && ` · Coach ${target.coach}`}
              </span>
            </div>
            <div className={styles.visibility}>
              <span className={styles.visibilityTitle}>What your coaching staff will see</span>
              <span className={styles.infoText}>
                Your check-in answers (sleep, tiredness, soreness, how you feel), training effort and any symptoms you
                report. Nothing else on your phone.
              </span>
            </div>
            {backend && (
              <>
                <span className={styles.visibilityTitle}>Create your account</span>
                <label className={ui.field}>
                  First name
                  <Input name="firstName" required maxLength={100} autoComplete="given-name" />
                </label>
                <label className={ui.field}>
                  Last name
                  <Input name="lastName" required maxLength={100} autoComplete="family-name" />
                </label>
                <label className={ui.field}>
                  Email
                  <Input name="email" type="email" required maxLength={255} leftIcon="email" autoComplete="email" />
                </label>
                <label className={ui.field}>
                  Password
                  <Input
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    maxLength={128}
                    leftIcon="lock"
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                  />
                </label>
              </>
            )}
            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
            <div className={styles.grow} />
            <Button type="submit" fullWidth disabled={busy}>
              {busy ? 'Joining…' : 'Join team'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
