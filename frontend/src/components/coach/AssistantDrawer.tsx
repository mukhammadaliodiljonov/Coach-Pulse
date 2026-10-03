import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { paths, useProfileLinkState } from '../../navigation/paths'
import { useCoachStore } from '../../state/coachStore'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { Input } from '../ui/Input'
import { StatusBadge } from '../ui/StatusBadge'
import { answerFor, FALLBACK_ANSWER, matchQuestion, suggestedQuestions, type Answer, type QuestionId } from './assistantAnswers'
import styles from './AssistantDrawer.module.css'
import { useAssistant } from './useAssistant'

interface Exchange {
  key: string
  question: string
  answerId: QuestionId | null
}

/** "CoachPulse Assistant" — a future feature, answering from today's team data. */
export function AssistantDrawer() {
  const { team, setAssistantPath } = useCoachStore()
  const { open: assistantOpen, setOpen: setAssistantOpen } = useAssistant()
  const navigate = useNavigate()
  const linkState = useProfileLinkState()
  const [chat, setChat] = useState<Exchange[]>([])
  const [draft, setDraft] = useState('')
  const closeRef = useRef<HTMLButtonElement>(null)
  const endRef = useRef<HTMLDivElement>(null)

  // On open: focus the drawer and let Escape close it.
  useEffect(() => {
    if (!assistantOpen) return
    closeRef.current?.focus()
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAssistantPath(null)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [assistantOpen, setAssistantPath])

  // Keep the newest answer in view. (Block body: scrollIntoView may return a promise, which must not be returned as a cleanup.)
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [chat])

  if (!assistantOpen) return null

  const ask = (question: string, answerId: QuestionId | null) =>
    setChat((prev) => [...prev, { key: crypto.randomUUID(), question, answerId }])
  const asked = new Set(chat.map((c) => c.answerId))
  const suggestions = suggestedQuestions(team).filter((q) => !asked.has(q.id))

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const question = draft.trim()
    if (!question) return
    ask(question, matchQuestion(question, team))
    setDraft('')
  }

  return (
    <aside role="dialog" aria-label="CoachPulse Assistant" className={styles.drawer}>
      <div className={styles.header}>
        <span className={styles.headerIcon}>
          <Icon name="chat" size={18} />
        </span>
        <div className={styles.headerText}>
          <span className={styles.title}>CoachPulse Assistant</span>
          <span className={styles.subtitle}>Answers from today’s team data</span>
        </div>
        <button ref={closeRef} type="button" className={styles.iconButton} aria-label="Close assistant" onClick={() => setAssistantOpen(false)}>
          <Icon name="close" size={18} />
        </button>
      </div>

      <div className={styles.body} aria-live="polite">
        {chat.length === 0 && (
          <p className={styles.intro}>Ask about who needs attention, why someone was flagged, or what changed this week.</p>
        )}
        {chat.map((c) => (
          <AnswerCard
            key={c.key}
            question={c.question}
            answer={c.answerId ? answerFor(c.answerId, team) : FALLBACK_ANSWER}
            onOpen={(to) => navigate(to, { state: linkState })}
          />
        ))}
        {suggestions.length > 0 && (
          <div className={styles.suggestions}>
            {suggestions.map((q) => (
              <button key={q.id} type="button" className={styles.suggestion} onClick={() => ask(q.text, q.id)}>
                {q.text}
              </button>
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form className={styles.footer} onSubmit={onSubmit}>
        <Input
          variant="filled"
          placeholder="Ask about your team…"
          aria-label="Ask about your team"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          trailing={
            <button type="submit" className={styles.send} aria-label="Send" disabled={!draft.trim()}>
              <Icon name="send" size={22} />
            </button>
          }
        />
        <span className={styles.disclaimer}>Observations only. The Assistant doesn’t diagnose or clear athletes to play.</span>
      </form>
    </aside>
  )
}

function AnswerCard({ question, answer, onOpen }: { question: string; answer: Answer; onOpen: (to: string) => void }) {
  const { cta } = answer
  return (
    <>
      <div className={styles.question}>{question}</div>
      <div className={styles.answer}>
        <span className={styles.answerTitle}>{answer.title}</span>
        {answer.intro && <span className={styles.answerIntro}>{answer.intro}</span>}
        {answer.rows.map((r) => (
          <button key={`${r.athleteId}-${r.title}`} type="button" className={styles.row} onClick={() => onOpen(paths.athlete(r.athleteId))}>
            <StatusBadge status={r.status} iconOnly iconSize={18} className={styles.rowBadge} />
            <span className={styles.rowText}>
              <span className={styles.rowTitle}>{r.title}</span>
              <span className={styles.rowDetail}>{r.detail}</span>
            </span>
          </button>
        ))}
        {answer.bullets.map((b) => (
          <div key={b} className={styles.bullet}>
            {b}
          </div>
        ))}
        {cta && (
          <div>
            <Button size="sm" variant="white" onClick={() => onOpen(cta.to)}>
              {cta.label}
            </Button>
          </div>
        )}
      </div>
    </>
  )
}
