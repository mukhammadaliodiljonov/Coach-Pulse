import { SCENARIOS, type Scenario } from '../data/roster'

/**
 * Demo states from the design handoff, chosen with `?scenario=` on page load:
 * typical, allGreen, noCheckins, loading, offline.
 */
export function readScenario(): Scenario {
  const requested = new URLSearchParams(window.location.search).get('scenario')
  return SCENARIOS.find((s) => s === requested) ?? 'typical'
}
