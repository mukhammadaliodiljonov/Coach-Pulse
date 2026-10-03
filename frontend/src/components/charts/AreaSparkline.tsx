import styles from './AreaSparkline.module.css'

interface AreaSparklineProps {
  values: number[]
  min: number
  max: number
  baseline: number
  /** Amber when the metric has moved the worse way. */
  worse: boolean
  label: string
}

export function AreaSparkline({ values, min, max, baseline, worse, label }: AreaSparklineProps) {
  const y = (v: number) => (1 - (v - min) / (max - min)) * 100
  const line = values.map((v, i) => `${i ? 'L' : 'M'}${(i / (values.length - 1)) * 100} ${y(v)}`).join(' ')
  const color = worse ? 'var(--cp-review-stroke)' : 'var(--cp-primary)'
  return (
    <div className={styles.plot} role="img" aria-label={label}>
      <div className={styles.baseline} style={{ top: `${y(baseline)}%` }} aria-hidden="true" />
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={styles.svg} aria-hidden="true">
        <path d={`${line} L100 100 L0 100 Z`} className={styles.area} style={{ fill: color }} />
        <path d={line} className={styles.line} style={{ stroke: color }} vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  )
}
