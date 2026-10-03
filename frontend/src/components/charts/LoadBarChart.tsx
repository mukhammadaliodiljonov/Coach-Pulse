import styles from './LoadBarChart.module.css'

interface LoadBarChartProps {
  /** Daily load in AU, oldest first; the last bar is the latest session. */
  values: number[]
  range: { low: number; high: number }
  /** Date of the first bar. */
  start: Date
}

const PAD = '10px'
const dayLabel = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

/** Last-14-days load bars over the athlete's usual range band; bars above the range are amber. */
export function LoadBarChart({ values, range, start }: LoadBarChartProps) {
  const max = Math.max(range.high * 1.3, ...values) * 1.05
  const fraction = (v: number) => v / max
  const days = values.map((_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
  const latest = values.length - 1
  const summary = `Training load, last ${values.length} days. Latest session ${values[latest]} AU; usual range ${range.low}–${range.high} AU.`

  return (
    <div role="img" aria-label={summary}>
      <div className={styles.bars} aria-hidden="true">
        <div
          className={styles.band}
          style={{
            top: `calc(${PAD} + ${1 - fraction(range.high)} * (100% - ${PAD}))`,
            height: `calc(${fraction(range.high - range.low)} * (100% - ${PAD}))`,
          }}
        />
        <span className={styles.bandLabel} style={{ top: `calc(${PAD} + ${1 - fraction(range.high)} * (100% - ${PAD}))` }}>
          Usual range {range.low}–{range.high} AU
        </span>
        {values.map((v, i) => (
          <div
            key={i}
            className={styles.bar}
            data-tone={v > range.high ? 'over' : i === latest ? 'latest' : undefined}
            style={{ height: `${fraction(v) * 100}%` }}
            title={`${dayLabel(days[i])}: ${v} AU`}
          />
        ))}
      </div>
      <div className={styles.labels} aria-hidden="true">
        {days.map((d, i) => (
          <span key={i} data-latest={i === latest}>
            {i === latest ? d.toLocaleDateString('en-US', { weekday: 'short' }) : i % 2 === 1 ? d.getDate() : ''}
          </span>
        ))}
      </div>
    </div>
  )
}
