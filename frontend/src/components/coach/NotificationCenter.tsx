import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { buildNotifications } from '../../data/activity'
import { paths } from '../../navigation/paths'
import { useCoachStore } from '../../state/coachStore'
import { Icon } from '../ui/Icon'
import { StatusBadge } from '../ui/StatusBadge'
import styles from './NotificationCenter.module.css'

export function NotificationCenter() {
  const { roster, team } = useCoachStore()
  const { pathname } = useLocation()
  // The page the popover was opened on; navigating anywhere else closes it.
  const [openOn, setOpenOn] = useState<string | null>(null)
  const open = openOn === pathname
  const setOpen = (next: boolean) => setOpenOn(next ? pathname : null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const notifications = useMemo(
    () => buildNotifications(roster, team.fatigueAboveUsual.length, team.showPattern),
    [roster, team],
  )

  // Also close on outside click and Escape.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpenOn(null)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenOn(null)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const count = notifications.length
  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.bell}
        aria-label={count ? `Notifications, ${count} new` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(!open)}
      >
        <Icon name="bell" size={20} />
        {count > 0 && <span className={styles.dot} aria-hidden="true" />}
      </button>
      {open && (
        <div role="dialog" aria-label="Notifications" className={styles.popover}>
          <div className={styles.header}>
            <span className={styles.title}>Notifications</span>
            {count > 0 && <span className={styles.newCount}>{count} new</span>}
          </div>
          {count === 0 ? (
            <p className={styles.empty}>You’re all caught up.</p>
          ) : (
            <ul className={styles.list}>
              {notifications.map((n) => (
                <li key={n.id}>
                  <button type="button" className={styles.item} onClick={() => navigate(n.to)}>
                    <StatusBadge status={n.status} iconOnly iconSize={20} className={styles.badge} />
                    <span className={styles.itemBody}>
                      <span className={styles.itemText}>{n.text}</span>
                      <span className={styles.itemTime}>{n.time}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className={styles.footer}>
            <Link to={paths.alerts}>View all alerts</Link>
          </div>
        </div>
      )}
    </div>
  )
}
