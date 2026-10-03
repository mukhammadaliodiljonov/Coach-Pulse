import { RouterProvider } from 'react-router/dom'
import { useAuth } from './auth/useAuth'
import { router } from './router'
import { AthleteStoreProvider } from './state/AthleteStoreProvider'

export default function App() {
  const { session } = useAuth()
  // A new user (or signing out) starts from an empty athlete store, never the previous user's data.
  // The coach store lives inside the guarded coach routes (CoachApp).
  return (
    <AthleteStoreProvider key={session?.userId ?? 'signed-out'}>
      <RouterProvider router={router} />
    </AthleteStoreProvider>
  )
}
