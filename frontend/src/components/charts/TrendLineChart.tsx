import { Fragment } from 'react'
import styles from './TrendLineChart.module.css'

export interface TrendPoint {
  label: string
  value: number
  display: string
}

interface TrendLineChartProps {
  title: string
  points: TrendPoint[]
  min: number
  max: number
  ticks: number[]
  baseline: number
  baselineLabel: string
}

/** Seven-day team trend with the dashed team baseline; the latest point is emphasised. */
export function TrendLineChart({ title, points, min, max, ticks, baseline, baselineLabel }: TrendLineChartProps) {
  const y = (v: number) => (1 - (v - min) / (max - min)) * 100
  const x = (i: number) => (points.length > 1 ? (i / (points.length - 1)) * 100 : 50)
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)} ${y(p.value)}`).join(' ')
  const summary = `${title}: ${points.map((p) => `${p.label} ${p.display}`).join(', ')}. Usual ${baselineLabel}.`

  return (
    <div className={styles.chart} role="img" aria-label={summary}>
      <div className={styles.yAxis} aria-hidden="true">
        {ticks.map((t) => (
          <span key={t} className={styles.tick} style={{ top: `${y(t)}%` }}>
            {t}
          </span>
        ))}
      </div>
      <div className={styles.column} aria-hidden="true">
        <div className={styles.plot}>
          {ticks.map((t) => (
            <div key={t} className={styles.grid} style={{ top: `${y(t)}%` }} />
          ))}
          <div className={styles.baseline} style={{ top: `${y(baseline)}%` }} />
          <span className={styles.baselineLabel} style={{ top: `${y(baseline)}%` }}>
            Usual {baselineLabel}
          </span>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={styles.svg}>
            <path d={`${line} L100 100 L0 100 Z`} className={styles.area} />
            <path d={line} className={styles.line} vectorEffect="non-scaling-stroke" />
          </svg>
          {points.map((p, i) => {
            const latest = i === points.length - 1
            const position = { left: `${x(i)}%`, top: `${y(p.value)}%` }
            return (
              <Fragment key={p.label}>
                <span className={styles.point} data-latest={latest} style={position} title={`${p.label}: ${p.display}`} />
                <span className={styles.value} data-latest={latest} style={position}>
                  {p.display}
                </span>
              </Fragment>
            )
          })}
        </div>
        <div className={styles.xAxis}>
          {points.map((p) => (
            <span key={p.label}>{p.label}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
