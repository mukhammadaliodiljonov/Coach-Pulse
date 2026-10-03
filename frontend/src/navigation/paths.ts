import { matchPath, useLocation } from 'react-router'

export type AthleteFilter = 'all' | 'high' | 'review' | 'normal' | 'fatigue' | 'pending'
export type AlertFilter = 'all' | 'high' | 'review' | 'resolved'
export type CheckInFlow = 'daily' | 'post'

export const paths = {
  overview: '/',
  athletes: (filter?: AthleteFilter) =>
    filter && filter !== 'all' ? `/athletes?filter=${filter}` : '/athletes',
  athlete: (id: string) => `/athletes/${id}`,
  alerts: '/alerts',
  alert: (id: string) => `/alerts/${id}`,
  training: '/training',
  trends: '/trends',
  reports: '/reports',
  settings: '/settings',
  login: '/login',
  signup: '/signup',
  setup: '/setup',
  athleteApp: {
    home: '/athlete',
    login: '/athlete/login',
    join: '/athlete/join',
    history: '/athlete/history',
    schedule: '/athlete/schedule',
    profile: '/athlete/profile',
    checkIn: (flow: CheckInFlow) => `/athlete/check-in/${flow}`,
  },
} as const

/** The coach screen a profile was opened from; it decides the profile's back button. */
export type Origin = 'overview' | 'athletes' | 'alerts' | 'alert'

export interface ProfileLinkState {
  from?: Origin
}

export function originOf(pathname: string): Origin | undefined {
  if (pathname === '/') return 'overview'
  if (pathname === '/athletes') return 'athletes'
  if (pathname === '/alerts') return 'alerts'
  if (matchPath('/alerts/:athleteId', pathname)) return 'alert'
  return undefined
}

/** Link state for opening an athlete profile from the current screen. */
export function useProfileLinkState(): ProfileLinkState {
  return { from: originOf(useLocation().pathname) }
}
