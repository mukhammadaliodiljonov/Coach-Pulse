import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { describeError } from '../../api/client'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import {
  DAILY_QUESTIONS,
  NONE_OF_THESE,
  POST_LISTS,
  RPE_WORDS,
  SAFETY_OPTIONS,
  SESSION_DURATIONS,
  type DailyAnswers,
} from '../../data/athleteApp'
import { SYMPTOMS, type Symptom } from '../../domain/types'
import { cx } from '../../lib/cx'
import { useTitle } from '../../lib/useTitle'
import { paths, type CheckInFlow as Flow } from '../../navigation/paths'
import { useAthleteStore } from '../../state/athleteStore'
import ui from '../../styles/ui.module.css'
import shared from './athlete.module.css'
import styles from './CheckInFlow.module.css'

type Step = 'daily' | 'rpe' | 'tired' | 'sore' | 'session' | 'safety' | 'done'

const STEPS: Record<Flow, Step[]> = {
  daily: ['daily', 'safety', 'done'],
  post: ['rpe', 'tired', 'sore', 'session', 'safety', 'done'],
}

interface Answers {
  daily: Partial<DailyAnswers>
  rpe: number | null
  tired: number | null
  sore: number | null
  duration: number | null
  weightBefore: string
  weightAfter: string
  symptoms: string[]
}

const EMPTY: Answers = {
  daily: {},
  rpe: null,
  tired: null,
  sore: null,
  duration: null,
  weightBefore: '',
  weightAfter: '',
  symptoms: [],
}

const isSymptom = (option: string): option is Symptom => (SYMPTOMS as readonly string[]).includes(option)

/** Weights are optional; anything that isn't a positive number is left out. */
function parseWeight(value: string): number | null {
  const kg = Number.parseFloat(value)
  return Number.isFinite(kg) && kg > 0 ? kg : null
}

export function CheckInFlow() {
  const { flow } = useParams()
  if (flow !== 'daily' && flow !== 'post') return <Navigate to={paths.athleteApp.home} replace />
  return <CheckIn key={flow} flow={flow} />
}

function CheckIn({ flow }: { flow: Flow }) {
  useTitle(flow === 'daily' ? 'Daily check-in' : 'Post-training check-in')
  const navigate = useNavigate()
  const { submitDaily, submitPostTraining, snapshot } = useAthleteStore()
  const firstName = snapshot?.profile.firstName
  const steps = STEPS[flow]
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Answers>(EMPTY)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)

  const step = steps[index]
  const total = steps.length - 1
  const set = (patch: Partial<Answers>) => setAnswers((prev) => ({ ...prev, ...patch }))

  // Each step starts at the top, with focus on its question.
  useEffect(() => {
    // Each step starts at the top: of its column if that scrolls, and of the page.
    scrollRef.current?.scrollTo({ top: 0 })
    window.scrollTo({ top: 0 })
    headingRef.current?.focus()
  }, [index])

  const answered: Record<Step, boolean> = {
    daily: DAILY_QUESTIONS.every((q) => answers.daily[q.key]),
    rpe: answers.rpe !== null,
    tired: answers.tired !== null,
    sore: answers.sore !== null,
    session: answers.duration !== null,
    safety: answers.symptoms.length > 0,
    done: true,
  }

  const send = async () => {
    const symptoms = answers.symptoms.filter(isSymptom)
    if (flow === 'daily') {
      const { sleep, fatigue, soreness, wellness } = answers.daily
      if (!sleep || !fatigue || !soreness || !wellness) throw new Error('Answer every question first.')
      await submitDaily({ sleep, fatigue, soreness, wellness, symptoms })
      return
    }
    const { rpe, tired, sore, duration } = answers
    if (rpe === null || tired === null || sore === null || duration === null) throw new Error('Answer every question first.')
    await submitPostTraining({
      rpe,
      tiredness: tired,
      soreness: sore,
      durationMinutes: duration,
      weightBeforeKg: parseWeight(answers.weightBefore),
      weightAfterKg: parseWeight(answers.weightAfter),
      symptoms,
    })
  }

  const next = async () => {
    if (step === 'done') {
      navigate(paths.athleteApp.home)
      return
    }
    if (step === 'safety') {
      setSending(true)
      setError(null)
      try {
        await send()
      } catch (e) {
        setError(`Your check-in wasn’t sent. ${describeError(e)}`)
        return
      } finally {
        setSending(false)
      }
    }
    setIndex(index + 1)
  }

  const heading = (text: string) => (
    <h1 ref={headingRef} tabIndex={-1} className={cx(shared.stepTitle, styles.title)}>
      {text}
    </h1>
  )

  const anySymptom = answers.symptoms.some((s) => s !== NONE_OF_THESE)

  return (
    <>
      {step !== 'done' && (
        <div className={styles.header}>
          <div className={styles.headerRow}>
            <button
              type="button"
              className={shared.backButton}
              aria-label="Back"
              onClick={() => (index === 0 ? navigate(paths.athleteApp.home) : setIndex(index - 1))}
            >
              <Icon name="back" size={14} />
            </button>
            <span className={styles.stepLabel}>
              Step {index + 1} of {total}
            </span>
            <span className={styles.spacer} />
          </div>
          <div
            className={styles.progress}
            role="progressbar"
            aria-label="Check-in progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(((index + 1) / total) * 100)}
          >
            <span style={{ width: `${((index + 1) / total) * 100}%` }} />
          </div>
        </div>
      )}

      <div ref={scrollRef} className={shared.scroll}>
        {step === 'daily' && (
          <>
            {heading('How are you feeling?')}
            {DAILY_QUESTIONS.map((q) => (
              <RadioTiles
                key={q.key}
                legend={q.question}
                layout="scale"
                value={answers.daily[q.key] ?? null}
                onChange={(n) => set({ daily: { ...answers.daily, [q.key]: n } })}
                options={[1, 2, 3, 4, 5].map((n) => ({
                  value: n,
                  label: n,
                  ariaLabel: n === 1 ? `1, ${q.low}` : n === 5 ? `5, ${q.high}` : String(n),
                }))}
              >
                <div className={styles.ends} aria-hidden="true">
                  <span>{q.low}</span>
                  <span>{q.high}</span>
                </div>
              </RadioTiles>
            ))}
          </>
        )}

        {step === 'rpe' && (
          <>
            <RadioTiles
              legend={
                <span className={styles.intro}>
                  <span className={styles.eyebrow}>Post-training</span>
                  {heading('How hard did today’s session feel?')}
                  <span className={styles.hint}>1 = very easy · 10 = maximum effort</span>
                </span>
              }
              headingLegend
              layout="rpe"
              value={answers.rpe}
              onChange={(rpe) => set({ rpe })}
              options={Array.from({ length: 10 }, (_, i) => ({
                value: i + 1,
                label: i + 1,
                ariaLabel: `${i + 1}, ${RPE_WORDS[i + 1]}`,
              }))}
            />
            <div className={styles.word} aria-live="polite">
              {answers.rpe ? `${answers.rpe} — ${RPE_WORDS[answers.rpe]}` : 'Tap a number'}
            </div>
          </>
        )}

        {(step === 'tired' || step === 'sore') && (
          <RadioTiles
            legend={
              <span className={styles.intro}>
                <span className={styles.eyebrow}>Post-training</span>
                {heading(POST_LISTS[step].question)}
              </span>
            }
            headingLegend
            layout="list"
            value={answers[step]}
            onChange={(n) => set(step === 'tired' ? { tired: n } : { sore: n })}
            options={POST_LISTS[step].options.map((label, i) => ({
              value: i + 1,
              label: (
                <>
                  <span className={styles.number} aria-hidden="true">
                    {i + 1}
                  </span>
                  {label}
                </>
              ),
            }))}
          />
        )}

        {step === 'session' && (
          <>
            <div className={styles.intro}>
              <span className={styles.eyebrow}>Post-training</span>
              {heading('Session details')}
            </div>
            <RadioTiles
              legend="How long was the session?"
              layout="duration"
              value={answers.duration}
              onChange={(duration) => set({ duration })}
              options={SESSION_DURATIONS.map((d) => ({ value: d, label: `${d}m`, ariaLabel: `${d} minutes` }))}
            />
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>How much did you weigh?</legend>
              <div className={styles.weights}>
                <label className={styles.weight}>
                  Before training
                  <span className={styles.weightValue}>
                    <input
                      inputMode="decimal"
                      placeholder="0.0"
                      value={answers.weightBefore}
                      onChange={(e) => set({ weightBefore: e.target.value.replace(/[^\d.]/g, '') })}
                    />
                    kg
                  </span>
                </label>
                <label className={styles.weight}>
                  After training
                  <span className={styles.weightValue}>
                    <input
                      inputMode="decimal"
                      placeholder="0.0"
                      value={answers.weightAfter}
                      onChange={(e) => set({ weightAfter: e.target.value.replace(/[^\d.]/g, '') })}
                    />
                    kg
                  </span>
                </label>
              </div>
              <p className={shared.muted}>Optional. Helps your coach notice large changes after hard sessions.</p>
            </fieldset>
          </>
        )}

        {step === 'safety' && (
          <>
            <div className={styles.intro}>
              {heading('Quick safety check')}
              <p className={styles.question}>Are you experiencing any of these symptoms?</p>
              <p className={shared.muted}>Select all that apply.</p>
            </div>
            <fieldset className={styles.fieldset}>
              <legend className={ui.srOnly}>Symptoms</legend>
              {SAFETY_OPTIONS.map((option) => {
                const selected = answers.symptoms.includes(option)
                return (
                  <label key={option} className={styles.symptom} data-selected={selected}>
                    <input
                      type="checkbox"
                      className={styles.input}
                      checked={selected}
                      onChange={() => {
                        // "None of these" is exclusive of every symptom.
                        if (option === NONE_OF_THESE) {
                          set({ symptoms: selected ? [] : [NONE_OF_THESE] })
                        } else {
                          const rest = answers.symptoms.filter((s) => s !== NONE_OF_THESE && s !== option)
                          set({ symptoms: selected ? rest : [...rest, option] })
                        }
                      }}
                    />
                    <span className={styles.box} aria-hidden="true">
                      {selected && <Icon name="done" size={12} />}
                    </span>
                    {option}
                  </label>
                )
              })}
            </fieldset>
            {anySymptom && (
              <div role="status" className={styles.reassure}>
                <span className={styles.reassureTitle}>Thanks for letting us know.</span>
                <span className={styles.reassureText}>
                  Your response may require a coach or qualified professional to review it. If you feel worse, tell an
                  adult nearby straight away.
                </span>
              </div>
            )}
          </>
        )}

        {step === 'done' && (
          <div className={styles.done}>
            <span className={styles.doneIcon}>
              <Icon name="done" size={38} />
            </span>
            {heading('Check-in complete')}
            <p className={styles.thanks}>Thanks{firstName ? `, ${firstName}` : ''}.</p>
            <p className={styles.doneText}>Your coach can review your wellness information if follow-up is needed.</p>
          </div>
        )}
      </div>

      <div className={styles.footer}>
        {error && (
          <p className={cx(shared.error, styles.sendError)} role="alert">
            {error}
          </p>
        )}
        <Button fullWidth disabled={!answered[step] || sending} onClick={next}>
          {step === 'done'
            ? 'Back to home'
            : step === 'safety'
              ? sending
                ? 'Sending…'
                : error
                  ? 'Try again'
                  : 'Submit check-in'
              : 'Continue'}
        </Button>
      </div>
    </>
  )
}

interface RadioTilesProps {
  legend: ReactNode
  /** The legend holds the step's heading, so it needs more room below. */
  headingLegend?: boolean
  layout: 'scale' | 'rpe' | 'list' | 'duration'
  options: { value: number; label: ReactNode; ariaLabel?: string }[]
  value: number | null
  onChange: (value: number) => void
  children?: ReactNode
}

/** A native radio group drawn as large tap targets (52–60px). */
function RadioTiles({ legend, headingLegend, layout, options, value, onChange, children }: RadioTilesProps) {
  const name = useId()
  return (
    <fieldset className={styles.fieldset}>
      <legend className={headingLegend ? styles.headingLegend : styles.legend}>{legend}</legend>
      <div className={styles[layout]}>
        {options.map((o) => (
          <label key={o.value} className={styles.tile} data-selected={value === o.value}>
            <input
              type="radio"
              name={name}
              className={styles.input}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              aria-label={o.ariaLabel}
            />
            {o.label}
          </label>
        ))}
      </div>
      {children}
    </fieldset>
  )
}
