import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { describeError } from '../../api/client'
import { api } from '../../api/endpoints'
import type { TeamDto } from '../../api/types'
import { useAuth } from '../../auth/useAuth'
import { Button } from '../../components/ui/Button'
import { ChipGroup } from '../../components/ui/ChipGroup'
import { Icon } from '../../components/ui/Icon'
import { Input } from '../../components/ui/Input'
import { Logo } from '../../components/ui/Logo'
import { SampleDataNote } from '../../components/ui/SampleDataNote'
import { TEAM } from '../../data/team'
import { useTitle } from '../../lib/useTitle'
import { paths } from '../../navigation/paths'
import ui from '../../styles/ui.module.css'
import styles from './TeamSetup.module.css'

const STEPS = ['Create team', 'Add athletes', 'Set baseline', 'Ready'] as const
const SPORTS = ['Football', 'Basketball', 'Rugby', 'Hockey', 'Netball', 'Other']
const AGE_GROUPS = ['U12', 'U14', 'U15', 'U17', 'U19', 'Adult']
const FREQUENCIES = ['1–2 per week', '3–4 per week', '5+ per week']

const choices = (values: string[]) => values.map((v) => ({ value: v, label: v }))

// With the backend, "Create team" saves the team and the coach becomes its head coach. The later steps
// (adding athletes, the safety contact) aren't saved yet. With sample data nothing is saved.
export function TeamSetup() {
  useTitle('Team setup')
  const navigate = useNavigate()
  const { required: backend } = useAuth()
  const [step, setStep] = useState(0)
  const [name, setName] = useState<string>(backend ? '' : TEAM.name)
  const [created, setCreated] = useState<TeamDto | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const joinCode = backend ? (created?.joinCode ?? '') : TEAM.code
  const [count, setCount] = useState('24')
  const [sport, setSport] = useState('Football')
  const [ageGroup, setAgeGroup] = useState('U17')
  const [frequency, setFrequency] = useState('3–4 per week')
  const [athletes, setAthletes] = useState([
    { name: 'Alex Johnson', position: 'Midfielder' },
    { name: 'Emma Wilson', position: 'Forward' },
    { name: 'Noah Brown', position: 'Defender' },
  ])
  const [copied, setCopied] = useState(false)

  const last = step === STEPS.length - 1

  const createTeam = async () => {
    setSaving(true)
    setError(null)
    try {
      setCreated(await api.createTeam({ name: name.trim(), sport, ageGroup, trainingFrequency: frequency }))
      setStep(1)
    } catch (e) {
      setError(describeError(e))
    } finally {
      setSaving(false)
    }
  }

  const next = () => {
    if (last) navigate(paths.overview)
    else if (step === 0 && backend && !created) void createTeam()
    else setStep(step + 1)
  }

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(`Join ${name} on CoachPulse with team code ${joinCode}`)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard access can be refused; the code stays visible to copy by hand.
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <Logo className={styles.grow} />
        <Link to={backend ? paths.overview : paths.login}>Exit setup</Link>
      </div>

      <ol className={styles.steps} aria-label="Setup progress">
        {STEPS.map((label, i) => {
          const state = i < step ? 'done' : i === step ? 'current' : 'todo'
          return (
            <li key={label} className={styles.step} data-state={state} aria-current={state === 'current' ? 'step' : undefined}>
              <span className={styles.stepNumber}>
                {state === 'done' ? <Icon name="done" size={12} label="Done" /> : i + 1}
              </span>
              <span className={styles.stepLabel}>{label}</span>
              {i < STEPS.length - 1 && <span className={styles.stepBar} aria-hidden="true" />}
            </li>
          )
        })}
      </ol>

      <div className={styles.card}>
        {!backend && <SampleDataNote>Team setup isn’t connected to the server yet, so nothing here is saved.</SampleDataNote>}
        {backend && step === 1 && (
          <SampleDataNote>Athletes join with the code at /athlete/join. Adding them here isn’t connected yet.</SampleDataNote>
        )}
        {step === 0 && (
          <>
            <div className={styles.heading}>
              <h1 className={styles.title}>Create your team</h1>
              <p className={styles.lead}>You can change any of this later in Settings.</p>
            </div>
            <div className={styles.fields}>
              <label className={ui.field}>
                Team name
                <Input
                  value={name}
                  maxLength={150}
                  placeholder="e.g. Northside U17"
                  disabled={created !== null}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              {!backend && (
                <label className={ui.field}>
                  Number of athletes
                  <Input inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value.replace(/\D/g, ''))} />
                </label>
              )}
            </div>
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>Sport</legend>
              <ChipGroup label="Sport" tone="brand" value={sport} onChange={setSport} options={choices(SPORTS)} />
            </fieldset>
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>Age group</legend>
              <ChipGroup label="Age group" tone="brand" value={ageGroup} onChange={setAgeGroup} options={choices(AGE_GROUPS)} />
            </fieldset>
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>Training frequency</legend>
              <ChipGroup
                label="Training frequency"
                tone="brand"
                value={frequency}
                onChange={setFrequency}
                options={choices(FREQUENCIES)}
              />
            </fieldset>
          </>
        )}

        {step === 1 && (
          <>
            <div className={styles.heading}>
              <h1 className={styles.title}>Add athletes</h1>
              <p className={styles.lead}>Share a code so athletes join from their phone, or add them yourself.</p>
            </div>
            <div className={styles.code}>
              <div className={styles.codeText}>
                <span className={styles.codeLabel}>Team code</span>
                <span className={styles.codeValue}>{joinCode}</span>
                <span className={styles.codeHint}>Athletes enter this in the CoachPulse athlete app.</span>
              </div>
              <Button variant="white" size="md" onClick={copyInvite}>
                {copied ? 'Copied' : 'Copy invite link'}
              </Button>
            </div>
            {!backend && (
              <div className={styles.manual}>
                <span className={styles.manualTitle}>Or add manually</span>
                {athletes.map((a, i) => (
                  <div key={i} className={styles.manualRow}>
                    <input
                      className={styles.manualInput}
                      aria-label={`Athlete ${i + 1} name`}
                      placeholder="Name"
                      value={a.name}
                      onChange={(e) => setAthletes(athletes.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                    />
                    <input
                      className={styles.manualInput}
                      aria-label={`Athlete ${i + 1} position`}
                      placeholder="Position"
                      value={a.position}
                      onChange={(e) =>
                        setAthletes(athletes.map((x, j) => (j === i ? { ...x, position: e.target.value } : x)))
                      }
                    />
                  </div>
                ))}
                <div className={styles.buttons}>
                  <Button variant="outline" size="sm" onClick={() => setAthletes([...athletes, { name: '', position: '' }])}>
                    Add another
                  </Button>
                  <Button variant="ghost" size="sm">
                    Upload CSV
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <div className={styles.heading}>
              <h1 className={styles.title}>Set baseline</h1>
              <p className={styles.lead}>
                CoachPulse compares each athlete with their own usual range. Here’s how that works.
              </p>
            </div>
            <div className={styles.explainers}>
              <div className={styles.explainer}>
                <span className={styles.explainerWhen}>First 7–14 days</span>
                <span className={styles.explainerTitle}>Learning usual ranges</span>
                <span className={styles.explainerText}>
                  Safety symptoms are flagged from day one. Other signals start once a baseline exists.
                </span>
              </div>
              <div className={styles.explainer}>
                <span className={styles.explainerWhen}>After that</span>
                <span className={styles.explainerTitle}>Personal comparisons</span>
                <span className={styles.explainerText}>“Fatigue 5/5 vs usual 2/5” — not one fixed number for everyone.</span>
              </div>
              <div className={styles.explainer}>
                <span className={styles.explainerWhen}>Always</span>
                <span className={styles.explainerTitle}>Your protocol leads</span>
                <span className={styles.explainerText}>
                  Alerts point to your organization’s health and safety protocol.
                </span>
              </div>
            </div>
            <label className={ui.field}>
              Safety contact for escalations (optional)
              <Input type="email" leftIcon="email" placeholder="e.g. welfare@club.org" />
            </label>
          </>
        )}

        {last && (
          <div className={styles.ready}>
            <span className={styles.readyIcon}>
              <Icon name="done" size={34} />
            </span>
            <h1 className={styles.title}>{name || 'Your team'} is ready</h1>
            <p className={styles.readyText}>
              Athletes get a reminder at 7:30 AM tomorrow. You’ll see who needs attention as check-ins arrive.
            </p>
          </div>
        )}

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <div className={styles.footer}>
          {/* With the backend the team exists after step 1, so there's no going back to create it again. */}
          {step > (backend ? 1 : 0) && !last && (
            <Button variant="ghost" size="md" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          <span className={styles.grow} />
          {(step === 1 || step === 2) && (
            <Button variant="ghost" size="md" onClick={() => setStep(step + 1)}>
              Skip for now
            </Button>
          )}
          <Button size="md" onClick={next} disabled={saving || (step === 0 && !name.trim())}>
            {saving ? 'Creating team…' : last ? 'Go to dashboard' : step === 0 && backend ? 'Create team' : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  )
}
