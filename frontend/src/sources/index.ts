import type { Scenario } from '../data/roster'
import { apiAthleteSource, apiCoachSource } from './api'
import { mockAthleteSource, mockCoachSource } from './mock'
import type { AthleteSource, CoachSource, DataSourceKind } from './types'

/** Set VITE_DATA_SOURCE=api (or run `npm run dev:api`) to use the backend instead of sample data. */
export const DATA_SOURCE: DataSourceKind = import.meta.env.VITE_DATA_SOURCE === 'api' ? 'api' : 'mock'

export function createCoachSource(scenario: Scenario): CoachSource {
  return DATA_SOURCE === 'api' ? apiCoachSource() : mockCoachSource(scenario)
}

export function createAthleteSource(scenario: Scenario): AthleteSource {
  return DATA_SOURCE === 'api' ? apiAthleteSource() : mockAthleteSource(scenario)
}
