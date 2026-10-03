import { createBrowserRouter, Navigate } from 'react-router'
import { CoachLayout } from './components/coach/CoachLayout'
import { RootLayout } from './components/RootLayout'
import { RouteError } from './components/RouteError'
import { AthleteHistory } from './pages/athlete/AthleteHistory'
import { AthleteHome } from './pages/athlete/AthleteHome'
import { AthleteJoin } from './pages/athlete/AthleteJoin'
import { AthleteLayout, AthleteTabs, RequireAthlete } from './pages/athlete/AthleteLayout'
import { AthleteLogin } from './pages/athlete/AthleteLogin'
import { AthleteSchedule } from './pages/athlete/AthleteSchedule'
import { AthleteSelfProfile } from './pages/athlete/AthleteSelfProfile'
import { CheckInFlow } from './pages/athlete/CheckInFlow'
import { Login } from './pages/auth/Login'
import { TeamSetup } from './pages/auth/TeamSetup'
import { AlertDetail } from './pages/coach/AlertDetail'
import { Alerts } from './pages/coach/Alerts'
import { AthleteProfile } from './pages/coach/AthleteProfile'
import { Athletes } from './pages/coach/Athletes'
import { Overview } from './pages/coach/Overview'
import { Reports } from './pages/coach/Reports'
import { Settings } from './pages/coach/Settings'
import { Training } from './pages/coach/Training'
import { Trends } from './pages/coach/Trends'

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteError />,
    children: [
      { path: 'login', element: <Login /> },
      { path: 'setup', element: <TeamSetup /> },
      {
        path: 'athlete',
        element: <AthleteLayout />,
        children: [
          { path: 'login', element: <AthleteLogin /> },
          { path: 'join', element: <AthleteJoin /> },
          {
            element: <AthleteTabs />,
            children: [
              { index: true, element: <AthleteHome /> },
              { path: 'history', element: <AthleteHistory /> },
              { path: 'schedule', element: <AthleteSchedule /> },
              { path: 'profile', element: <AthleteSelfProfile /> },
            ],
          },
          {
            element: <RequireAthlete />,
            children: [{ path: 'check-in/:flow', element: <CheckInFlow /> }],
          },
        ],
      },
      {
        element: <CoachLayout />,
        children: [
          { index: true, element: <Overview /> },
          { path: 'athletes', element: <Athletes /> },
          { path: 'athletes/:athleteId', element: <AthleteProfile /> },
          { path: 'alerts', element: <Alerts /> },
          { path: 'alerts/:athleteId', element: <AlertDetail /> },
          { path: 'training', element: <Training /> },
          { path: 'trends', element: <Trends /> },
          { path: 'reports', element: <Reports /> },
          { path: 'settings', element: <Settings /> },
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
])
