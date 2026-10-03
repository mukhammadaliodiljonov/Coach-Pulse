# CoachPulse — web front end

Coach web app (desktop-first, responsive) and athlete check-in app (mobile-first) for CoachPulse, built from the
design handoff (`design_handoff_coachpulse`). React 19 + TypeScript + Vite, React Router 8, CSS Modules.

Data is **mocked** until the backend exists: the sample team, roster and audit trail live in `src/data/`, and
sign-in accepts anything.

## Commands

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # signal engine + CSV tests (Vitest)
npm run lint     # oxlint
npm run build    # type-check + production build
```

## Demo scenarios

Append `?scenario=` to the first URL you open to see the states from the handoff:

| Scenario | Shows |
|---|---|
| `typical` (default) | 2 high priority, 4 needs review, team fatigue pattern |
| `allGreen` | “Your team looks good today.” |
| `noCheckins` | “Waiting for today’s athlete check-ins” |
| `loading` | Skeleton dashboard |
| `offline` | Offline banner with Retry |

## Routes

| Coach | | Athlete (`/athlete`) | |
|---|---|---|---|
| `/` | Overview | `/athlete/login` | Sign in |
| `/athletes?filter=` | Athletes list | `/athlete/join` | Join with team code |
| `/athletes/:id` | Athlete profile | `/athlete` | Home |
| `/alerts?filter=` | Alerts | `/athlete/check-in/daily` | Daily check-in |
| `/alerts/:id` | Alert detail | `/athlete/check-in/post` | Post-training check-in |
| `/training` `/trends` `/reports` `/settings` | | `/athlete/history` `/schedule` `/profile` | |
| `/login` `/setup` | Sign in, team setup | | |

The athlete app renders in a 390×780 phone frame on wide screens and full screen below 520px.

## Structure

```
src/
  domain/      signal engine (signals.ts), team summary, types — pure, unit-tested
  data/        sample data: roster + scenarios, audit trail, sessions, trends, reports, athlete app
  state/       coach store (recorded actions, audit trail, dialogs, toast) and athlete store
  navigation/  route paths and the profile "back" origin
  components/
    ui/        design-system components: Button, Input, StatusBadge, Avatar, Toggle, Modal, Toast…
    charts/    trend line, load bars, sparkline
    coach/     shell: sidebar, top bar, bottom nav, notifications, assistant, record-action dialog
  pages/       coach/, auth/, athlete/
  styles/      tokens.css (colours, shadows, radii, motion), global.css, ui.module.css
```

## Signal engine

`src/domain/signals.ts` implements the handoff’s rules, comparing each athlete with **their own** baseline:

- **Safety symptom** → high priority (any symptom from the safety list).
- **Recovery signal** → needs review (fatigue or soreness ≥ 2 above baseline, wellness ≥ 2 below).
- **Training signal** → needs review (load ≥ 15% above the recent baseline).
- Until a baseline exists, only safety symptoms flag. The team pattern card appears from 5 athletes.

The thresholds are prototype placeholders. Have them reviewed by a qualified sports-medicine professional before
launch, and run the same rules server-side once the API exists. The UI never shows a numeric risk score.

## Differences from the prototype

- Headings use relative line-heights. The prototype inherits a fixed 20px line-height, so large text overlaps.
- The design system’s `lock` icon is actually an eye-with-slash, so it’s replaced with a padlock. The athlete home
  chevrons point forward instead of reusing the “back” arrow.
- Notifications are derived from today’s data (safety symptoms, notable fatigue, team pattern) rather than a fixed list.
- Export CSV downloads the previewed report. Export PDF prints only the report (use “Save as PDF”).
- Choosing a new safety protocol document shows the file name; uploading needs the backend.
