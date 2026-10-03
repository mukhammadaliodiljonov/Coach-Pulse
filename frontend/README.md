# CoachPulse — web front end

Coach web app (desktop-first, responsive) and athlete check-in app (mobile-first) for CoachPulse, built from the
design handoff (`design_handoff_coachpulse`). React 19 + TypeScript + Vite, React Router 8, CSS Modules.

## Commands

```bash
npm install
npm run dev       # the Spring Boot backend on :8080, http://localhost:5173
npm run dev:mock  # sample data instead of the backend (no sign-in needed)
npm test         # signal engine, API adapters, client, CSV (Vitest)
npm run lint     # oxlint
npm run build    # type-check + production build
```

## Data: sample data or the backend

The app reads everything through a data source (`src/sources/`):

- **Backend** (default) — requests go to `/api`, which the dev server proxies to `API_PROXY_TARGET` (default
  `http://localhost:8080`). Start the Spring Boot app first. See `.env.example`.
- **Sample data** — set `VITE_DATA_SOURCE=mock` (that's what `npm run dev:mock` does, via `.env.mock`): a fictional
  team from the design handoff, kept in memory. Actions and check-ins you save last until you reload.

The backend doesn't have these endpoints yet: the contract the app expects is in
[`docs/api-contract.md`](../docs/api-contract.md), with the TypeScript shapes in `src/api/types.ts`. In backend mode
the app shows real loading, error and offline states, refreshes every minute, and marks the screens whose endpoints
come later (sessions, trends, reports, settings, team setup, sign-in) as sample data.

### Sign-in and protected routes

With the backend, both apps need a real sign-in (`POST /api/auth/login`); with sample data they stay an open
demo. Coaches create an account at `/signup` (`POST /api/auth/register`, then signed in automatically). Athletes
can't sign up yet: the backend has no athlete registration or team-code join. The code is in `src/auth/`:

- **Session**: the JWT from login is kept in `sessionStorage` for this tab only. It survives a reload and is cleared
  when the tab closes, on log out, when the token expires (a timer at its `exp`), and when the API answers `401`.
  The sign-in page then says the session expired.
- **API requests** send it as `Authorization: Bearer <token>`, never in URLs or bodies.
- **Routes**: coach pages need a `COACH` or `ADMIN` account and athlete pages an `ATHLETE` one. Signed-out users go
  to the matching sign-in page and come back afterwards; users outside a page's role go to their own home.
  `/login`, `/signup`, `/setup`, `/athlete/login` and `/athlete/join` are public.
- The role is read from the token without verifying it, which is fine for choosing screens: **the backend verifies
  the token and enforces roles on every request.** Hiding a page here is not a security boundary.

### Demo scenarios (sample data)

With `npm run dev:mock`, append `?scenario=` to the first URL you open:

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
| `/login` `/signup` `/setup` | Sign in, create account, team setup | | |

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
