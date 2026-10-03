import { apiRequest } from './client'
import type {
  ActivityDto,
  AlertDto,
  AlertStatus,
  AthleteTodayDto,
  CheckinDayDto,
  CoachActionDto,
  LoginRequest,
  LoginResponse,
  MeDto,
  MorningCheckinDto,
  MorningCheckinRequest,
  RegistrationRequest,
  RegistrationResponse,
  RecordActionRequest,
  TeamDayDto,
  TeamDto,
  WorkoutCheckinDto,
  WorkoutCheckinRequest,
} from './types'

// One function per endpoint in docs/api-contract.md.

const id = encodeURIComponent

export const api = {
  register: (body: RegistrationRequest) =>
    apiRequest<RegistrationResponse>('/auth/register', { method: 'POST', body }),

  login: (body: LoginRequest) => apiRequest<LoginResponse>('/auth/login', { method: 'POST', body }),

  logout: () => apiRequest<void>('/auth/logout', { method: 'POST' }),

  getMe: (signal?: AbortSignal) => apiRequest<MeDto>('/me', { signal }),

  getTeam: (teamId: string, signal?: AbortSignal) => apiRequest<TeamDto>(`/teams/${id(teamId)}`, { signal }),

  getTeamDay: (teamId: string, signal?: AbortSignal) =>
    apiRequest<TeamDayDto>(`/teams/${id(teamId)}/athletes/today`, { signal }),

  getAlerts: (teamId: string, query: { status?: AlertStatus; limit?: number } = {}, signal?: AbortSignal) => {
    const params = new URLSearchParams()
    if (query.status) params.set('status', query.status)
    if (query.limit) params.set('limit', String(query.limit))
    const search = params.size ? `?${params}` : ''
    return apiRequest<AlertDto[]>(`/teams/${id(teamId)}/alerts${search}`, { signal })
  },

  getActivity: (teamId: string, limit = 50, signal?: AbortSignal) =>
    apiRequest<ActivityDto[]>(`/teams/${id(teamId)}/activity?limit=${limit}`, { signal }),

  recordAction: (athleteId: string, body: RecordActionRequest) =>
    apiRequest<CoachActionDto>(`/athletes/${id(athleteId)}/actions`, { method: 'POST', body }),

  getAthleteToday: (athleteId: string, signal?: AbortSignal) =>
    apiRequest<AthleteTodayDto>(`/athletes/${id(athleteId)}/today`, { signal }),

  getCheckins: (athleteId: string, days = 7, signal?: AbortSignal) =>
    apiRequest<CheckinDayDto[]>(`/athletes/${id(athleteId)}/checkins?days=${days}`, { signal }),

  submitMorningCheckin: (athleteId: string, body: MorningCheckinRequest) =>
    apiRequest<MorningCheckinDto>(`/athletes/${id(athleteId)}/morning-checkins`, { method: 'POST', body }),

  submitWorkoutCheckin: (athleteId: string, body: WorkoutCheckinRequest) =>
    apiRequest<WorkoutCheckinDto>(`/athletes/${id(athleteId)}/workout-checkins`, { method: 'POST', body }),
}
