# CoachPulse — web front end

Coach web app (desktop-first, responsive) and athlete check-in app (mobile-first) for CoachPulse, built from the
design handoff (`design_handoff_coachpulse`). React 19 + TypeScript + Vite, React Router 8, CSS Modules.

## Commands

```bash
npm install
npm run dev      # sample data, http://localhost:5173
npm run dev:api  # the Spring Boot backend on :8080 instead of sample data
npm test         # signal engine, API adapters, client, CSV (Vitest)
npm run lint     # oxlint
npm run build    # type-check + production build
```

## Data: sample data or the backend

The app reads everything through a data source (`src/sources/`):

- **Sample data** (default) — a fictional team from the design handoff, kept in memory. Actions and check-ins you
  save last until you reload.
- **Backend** — set `VITE_DATA_SOURCE=api` (that's what `npm run dev:api` does, via `.env.api`). Requests go to
  `/api`, which the dev server proxies to `API_PROXY_TARGET` (default `http://localhost:8080`). See `.env.example`.

The backend doesn't have these endpoints yet: the contract the app expects is in
[`docs/api-contract.md`](../docs/api-contract.md), with the TypeScript shapes in `src/api/types.ts`. In backend mode
the app shows real loading, error and offline states, refreshes every minute, and marks the screens whose endpoints
come later (sessions, trends, reports, settings, team setup, sign-in) as sample data.

### Demo scenarios (sample data)

Append `?scenario=` to the first URL you open:

| Scenario | Shows |
|---|---|
| `typical` (default) | 2 high priority, 4 needs review, team fatigue pattern |
| `allGreen` | “Your team looks good today.” |
| `noCheckins` | “Waiting for today’s athlete check-ins” |
| `loading` | Skeleton while loading |
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
  api/         HTTP client (RFC 9457 errors), endpoints, DTO types, adapters from API shapes to the UI model
  sources/     the data-source interface, with sample-data and API implementations
  data/        sample data: roster + scenarios, audit trail, sessions, trends, reports, athlete app
  state/       coach store (loading/offline, recorded actions, dialogs, toast) and athlete store
  navigation/  route paths and the profile "back" origin
  components/
    ui/        design-system components: Button, Input, StatusBadge, Avatar, Toggle, Modal, Toast…
    charts/    trend line, load bars, sparkline
    coach/     shell: sidebar, top bar, bottom nav, notifications, assistant, record-action dialog, load states
  pages/       coach/, auth/, athlete/
  styles/      tokens.css (colours, shadows, radii, motion), global.css, ui.module.css
```

## Signal engine

`src/domain/signals.ts` implements the handoff’s rules, comparing each athlete with **their own** baseline:

- **Safety symptom** → high priority (any symptom from the safety list).
- **Recovery signal** → needs review (fatigue or soreness ≥ 2 above baseline, wellness ≥ 2 below).
- **Training signal** → needs review (load ≥ 15% above the recent baseline).
- Until a baseline exists, only safety symptoms flag. The team pattern card appears from 5 athletes.

With the backend, the server’s assessment wins once it sends one (`RED`/`YELLOW`/`GREEN` shown as High priority / Needs
review / Normal, reasons rebuilt with the same wording); until then the app evaluates check-ins itself. The
thresholds are prototype placeholders — have them reviewed by a qualified sports-medicine professional before
launch. The UI never shows a numeric risk score.

## Differences from the prototype

- Headings use relative line-heights. The prototype inherits a fixed 20px line-height, so large text overlaps.
- The design system’s `lock` icon is actually an eye-with-slash, so it’s replaced with a padlock. The athlete home
  chevrons point forward instead of reusing the “back” arrow.
- Missing data is shown as missing: a pending check-in shows dashes and “No check-in yet today” rather than values.
- Notifications are derived from today’s data (safety symptoms, notable fatigue, team pattern) rather than a fixed list.
- Export CSV downloads the previewed report. Export PDF prints only the report (use “Save as PDF”).
- Choosing a new safety protocol document shows the file name; uploading needs the backend.
