import { useState } from 'react'
import { AreaSparkline } from '../../components/charts/AreaSparkline'
import { ChipGroup } from '../../components/ui/ChipGroup'
import { SampleDataNote } from '../../components/ui/SampleDataNote'
import { buildTrendMetrics, TREND_RANGES, trendDay, trendInsights, type TrendMetric, type TrendRange } from '../../data/trends'
import { cx } from '../../lib/cx'
import { useTitle } from '../../lib/useTitle'
import { useCoachStore } from '../../state/coachStore'
import ui from '../../styles/ui.module.css'
import styles from './Trends.module.css'

function describe(m: TrendMetric) {
  const last = m.values[m.values.length - 1]
  const d = last - m.baseline
  const worse = m.worseWhenHigher ? d >= m.tolerance : -d >= m.tolerance
  const whole = m.unit === ' AU' || m.unit === '%'
  return {
    value: m.unit === ' / 5' ? last.toFixed(1) : String(last),
    change: `${d > 0 ? '+' : ''}${whole ? Math.round(d) : d.toFixed(1)}${m.unit === '%' ? ' pts' : ''} vs baseline`,
    worse,
  }
}

export function Trends() {
  useTitle('Team Trends')
  const { team } = useCoachStore()
  const [range, setRange] = useState<TrendRange>(7)
  const metrics = buildTrendMetrics(range, {
    ...team.averages,
    checkInPct: Math.round((team.checkedIn / team.size) * 100),
  })
  const start = trendDay(range, 0).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <div className={ui.page}>
      <header className={ui.pageHeader}>
        <div className={ui.pageHeading}>
          <h1 className={ui.pageTitle}>Team Trends</h1>
          <p className={ui.pageLead}>Team averages compared with the recent baseline.</p>
        </div>
        <ChipGroup
          label="Time range"
          semantics="tabs"
          value={range}
          onChange={setRange}
          options={TREND_RANGES.map((r) => ({ value: r, label: `${r} days` }))}
        />
      </header>
      <SampleDataNote>History is sample data until the team trends API exists; today’s values are real.</SampleDataNote>

      <div className={styles.insights}>
        {trendInsights(range, team.fatigueAboveUsual.length).map((insight) => (
          <div key={insight.text} className={styles.insight}>
            <span className={styles.tag}>{insight.tag}</span>
            <span className={styles.insightText}>{insight.text}</span>
          </div>
        ))}
      </div>

      <div className={styles.metrics}>
        {metrics.map((m) => {
          const { value, change, worse } = describe(m)
          return (
            <section key={m.label} aria-label={m.label} className={cx(ui.card, styles.metric)}>
              <div className={styles.metricHead}>
                <div className={cx(ui.titleBlock, styles.metricText)}>
                  <h2 className={styles.metricTitle}>{m.label}</h2>
                  <span className={styles.metricValue}>
                    {value}
                    <span className={styles.unit}>{m.unit}</span>
                  </span>
                </div>
                <span className={cx(ui.pill, styles.change)} data-tone={worse ? 'review' : 'normal'}>
                  {change}
                </span>
              </div>
              <AreaSparkline
                values={m.values}
                min={m.min}
                max={m.max}
                baseline={m.baseline}
                worse={worse}
                label={`${m.label} over the last ${range} days, ending at ${value}${m.unit}; baseline ${m.baseline}${m.unit}.`}
              />
              <div className={styles.axis} aria-hidden="true">
                <span>{start}</span>
                <span>Dashed line = baseline</span>
                <span>Today</span>
              </div>
            </section>
          )
        })}
      </div>

      <p className={ui.caption}>
        These are observations about the team, not diagnoses. Use them to plan sessions and start conversations.
      </p>
    </div>
  )
}
