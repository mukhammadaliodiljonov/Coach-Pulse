import { RouterProvider } from 'react-router/dom'
import { router } from './router'
import { AthleteStoreProvider } from './state/AthleteStoreProvider'
import { CoachStoreProvider } from './state/CoachStoreProvider'

export default function App() {
  return (
    <CoachStoreProvider>
      <AthleteStoreProvider>
        <RouterProvider router={router} />
      </AthleteStoreProvider>
    </CoachStoreProvider>
  )
}
