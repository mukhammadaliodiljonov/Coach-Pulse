import type { Scenario } from '../data/roster'
import { apiAthleteSource, apiCoachSource } from './api'
import { mockAthleteSource, mockCoachSource } from './mock'
import type { AthleteSource, CoachSource, DataSourceKind } from './types'

/** The backend by default. Set VITE_DATA_SOURCE=mock (or run `npm run dev:mock`) for the sample-data demo. */
export const DATA_SOURCE: DataSourceKind = import.meta.env.VITE_DATA_SOURCE === 'mock' ? 'mock' : 'api'

export function createCoachSource(scenario: Scenario): CoachSource {
  return DATA_SOURCE === 'api' ? apiCoachSource() : mockCoachSource(scenario)
}

export function createAthleteSource(scenario: Scenario): AthleteSource {
  return DATA_SOURCE === 'api' ? apiAthleteSource() : mockAthleteSource(scenario)
}
