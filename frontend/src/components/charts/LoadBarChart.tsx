import type { LoadPoint } from '../../domain/types'
import { parseLocalDate } from '../../lib/time'
import styles from './LoadBarChart.module.css'

interface LoadBarChartProps {
  /** Daily load in AU, oldest first; the last bar is the latest day. */
  points: LoadPoint[]
  /** The athlete's usual range, drawn as a band; null while it's still forming. */
  range: { low: number; high: number } | null
}

const PAD = '10px'
const dayLabel = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

/** Last-14-days load bars over the athlete's usual range band; bars above the range are amber. */
export function LoadBarChart({ points, range }: LoadBarChartProps) {
  const loads = points.map((p) => p.load)
  const max = Math.max(range ? range.high * 1.3 : 0, ...loads, 1) * 1.05
  const fraction = (v: number) => v / max
  const days = points.map((p) => parseLocalDate(p.date))
  const latest = points.length - 1
  const summary =
    `Training load, last ${points.length} days. Latest ${loads[latest]} AU` +
    (range ? `; usual range ${range.low}–${range.high} AU.` : '.')
  const bandTop = range ? `calc(${PAD} + ${1 - fraction(range.high)} * (100% - ${PAD}))` : undefined

  return (
    <div role="img" aria-label={summary}>
      <div className={styles.bars} aria-hidden="true">
        {range && (
          <>
            <div
              className={styles.band}
              style={{ top: bandTop, height: `calc(${fraction(range.high - range.low)} * (100% - ${PAD}))` }}
            />
            <span className={styles.bandLabel} style={{ top: bandTop }}>
              Usual range {range.low}–{range.high} AU
            </span>
          </>
        )}
        {points.map((p, i) => (
          <div
            key={p.date}
            className={styles.bar}
            data-tone={range && p.load > range.high ? 'over' : i === latest ? 'latest' : undefined}
            style={{ height: `${fraction(p.load) * 100}%` }}
            title={`${dayLabel(days[i])}: ${p.load} AU`}
          />
        ))}
      </div>
      <div className={styles.labels} aria-hidden="true">
        {days.map((d, i) => (
          <span key={points[i].date} data-latest={i === latest}>
            {i === latest ? d.toLocaleDateString('en-US', { weekday: 'short' }) : i % 2 === 1 ? d.getDate() : ''}
          </span>
        ))}
      </div>
    </div>
  )
}
