import { Link } from 'react-router'
import { paths } from '../navigation/paths'
import ui from '../styles/ui.module.css'
import { Button } from './ui/Button'

/** Shown when a screen throws while rendering. */
export function RouteError() {
  return (
    <div style={{ padding: '48px 16px' }}>
      <div className={ui.empty} style={{ maxWidth: 520, margin: '0 auto' }}>
        <span className={ui.emptyTitle}>Something went wrong. Try again.</span>
        <span className={ui.emptyText}>If it keeps happening, go back to the overview.</span>
        <Button size="md" onClick={() => window.location.reload()}>
          Try again
        </Button>
        <Link to={paths.overview}>Back to overview</Link>
      </div>
    </div>
  )
}
