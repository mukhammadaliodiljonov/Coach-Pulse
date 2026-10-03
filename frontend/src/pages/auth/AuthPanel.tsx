import { Logo } from '../../components/ui/Logo'
import styles from './Login.module.css'

/** The brand panel beside the sign-in and sign-up forms. */
export function AuthPanel() {
  return (
    <div className={styles.panel}>
      <Logo size={36} wordmarkSize={22} inverted wordmark="plain" className={styles.panelLogo} />
      <div className={styles.pitch}>
        <h1 className={styles.headline}>Healthier athletes. Safer teams. Smarter decisions.</h1>
        <p className={styles.tagline}>A simple safety layer for youth and amateur teams.</p>
      </div>
      <p className={styles.disclaimer}>
        CoachPulse highlights changes in wellbeing and training load. It doesn’t diagnose medical conditions.
      </p>
    </div>
  )
}
