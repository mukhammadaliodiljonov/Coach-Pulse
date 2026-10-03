# CoachPulse API contract (proposed)

**Status:** proposed by the web front end, for the backend to implement. **Implemented so far:** `GET /api/me`,
`POST /api/teams`, `GET /api/teams/{teamId}`, `.../athletes/today`, `.../alerts` and `.../activity` (see the notes
under each). The athlete endpoints and `POST /api/athletes/{athleteId}/actions` don't exist yet.

- TypeScript mirror of every shape: [`frontend/src/api/types.ts`](../frontend/src/api/types.ts)
- How the web app maps it onto screens: [`frontend/src/api/adapters.ts`](../frontend/src/api/adapters.ts)
- Try the web app against a running backend: start Spring Boot on `:8080`, then `cd frontend && npm run dev`
  (the dev server proxies `/api` to `http://localhost:8080`, so no CORS setup is needed in development).

## Conventions

- Base path `/api`. JSON with **camelCase** properties (Jackson's default).
- IDs are UUID strings. Timestamps are ISO-8601 with an offset (`2026-10-05T08:12:00Z`). Dates are `YYYY-MM-DD` in the
  team's local time zone.
- Enums are `UPPER_SNAKE_CASE`.
- Errors are RFC 9457 problem details, exactly as `GlobalExceptionHandler` already returns them. The web app shows
  `detail`, and reads `errors` for validation failures. A `502`/`503`/`504` (or no answer) makes it show
  “You’re offline” and keep the last data.
- **No numeric risk score in any response.** `risk_assessments.risk_score` stays internal. The UI shows only High
  priority / Needs review / Normal (`RED` / `YELLOW` / `GREEN`) and plain-language reasons, per the design handoff.
- **The API sends data, not sentences.** Codes and numbers only; every title and sentence is written by the web app,
  so wording stays consistent and never drifts into diagnosis (“has a concussion”, “safe to play”).
- **Auth isn’t designed yet.** Every endpoint assumes a signed-in user. Until there is auth, the backend can resolve a
  fixed development user for `/api/me`.

## Phase 1 — used by the web app now

| Method | Path | Used by |
|---|---|---|
| `GET` | `/api/me` | Both apps: who is signed in, their team(s) |
| `GET` | `/api/teams/{teamId}` | Coach app header, settings; athlete app coach names |
| `GET` | `/api/teams/{teamId}/athletes/today` | Overview, Athletes, Athlete profile, Alerts, Alert detail |
| `GET` | `/api/teams/{teamId}/alerts?status=RESOLVED&limit=20` | Alerts → Resolved |
| `GET` | `/api/teams/{teamId}/activity?limit=50` | Recent activity, follow-up history, audit trail |
| `POST` | `/api/athletes/{athleteId}/actions` | “Record action” |
| `GET` | `/api/athletes/{athleteId}/today` | Athlete home |
| `GET` | `/api/athletes/{athleteId}/checkins?days=7` | Athlete history |
| `POST` | `/api/athletes/{athleteId}/morning-checkins` | Daily check-in |
| `POST` | `/api/athletes/{athleteId}/workout-checkins` | Post-training check-in |

### `GET /api/me`

```json
{
  "user": { "id": "…", "email": "sam.rivera@club.org", "firstName": "Sam", "lastName": "Rivera", "role": "COACH" },
  "athleteId": null,
  "teams": [{ "teamId": "…", "name": "Northside U17", "sport": "Football", "memberRole": "HEAD_COACH" }]
}
```

`athleteId` is the `athlete_profiles.id` when the user is an athlete. The coach app uses the first team where
`memberRole` isn’t `ATHLETE`.

### `POST /api/teams`

Creates a team from the setup wizard; the signed-in coach becomes its `HEAD_COACH`. `COACH` or `ADMIN` only.

```json
{ "name": "Northside U17", "sport": "Football", "ageGroup": "U17", "trainingFrequency": "3–4 per week" }
```

`name` (≤150) and `sport` (≤100) are required. Responds `201` with the team, as `GET /api/teams/{teamId}` returns it,
including a generated `joinCode`.

All `/api/teams/{teamId}…` endpoints answer `404` unless the caller is one of the team's coaches.

### `GET /api/teams/{teamId}`

```json
{
  "id": "…",
  "name": "Northside U17",
  "sport": "Football",
  "ageGroup": "U17",
  "joinCode": "NSU-17K4",
  "coaches": [
    { "userId": "…", "firstName": "Sam", "lastName": "Rivera", "memberRole": "HEAD_COACH" },
    { "userId": "…", "firstName": "Priya", "lastName": "Shah", "memberRole": "ASSISTANT_COACH" }
  ]
}
```

### `GET /api/teams/{teamId}/athletes/today`

One entry per athlete on the team: today’s check-in plus the context needed to judge it. This is the main payload of
the coach app.

```json
{
  "teamId": "…",
  "date": "2026-10-05",
  "athletes": [
    {
      "athleteId": "…",
      "firstName": "Alex",
      "lastName": "Johnson",
      "position": "Midfielder",
      "dateOfBirth": "2010-03-14",
      "morningCheckin": {
        "id": "…", "createdAt": "2026-10-05T08:12:00Z",
        "sleepQuality": 3, "fatigue": 5, "muscleSoreness": 4, "overallWellness": 2,
        "symptoms": [], "notes": null
      },
      "latestWorkout": {
        "id": "…", "createdAt": "2026-10-04T18:20:00Z",
        "rpe": 10, "durationMinutes": 78, "tiredness": 5, "muscleSoreness": 4,
        "preWeightKg": null, "postWeightKg": null,
        "symptoms": ["HEADACHE", "DIZZINESS"]
      },
      "baseline": {
        "windowDays": 21,
        "sleepQuality": 4.1, "fatigue": 2.0, "muscleSoreness": 2.0, "overallWellness": 4.0,
        "trainingLoad": { "meanAu": 575, "lowAu": 500, "highAu": 650 }
      },
      "loadHistory": [{ "date": "2026-09-21", "loadAu": 520 }, { "date": "2026-09-22", "loadAu": 0 }],
      "assessment": null,
      "alert": { "id": "…", "status": "OPEN", "createdAt": "2026-10-05T08:42:00Z", "latestAction": null }
    }
  ]
}
```

- `morningCheckin` — today’s, or `null` while pending.
- `latestWorkout` — the most recent post-training check-in from any day. Load = `durationMinutes × rpe` (AU).
  Symptoms reported after yesterday’s training still count today.
- `baseline` — the athlete’s own averages over the last `windowDays` days. `null` until there are enough check-ins
  (7–14 days); until then only safety symptoms flag. `trainingLoad.lowAu`/`highAu` is the usual range (for example
  the 25th–75th percentile); `null` without enough sessions.
- `loadHistory` — exactly 14 entries, oldest first, `loadAu: 0` on days without a session.
- `assessment` — today’s result from the server’s signal engine, once it exists (see below). While it’s `null` the web
  app evaluates the check-in itself with the same rules.
- `alert` — today’s alert, if one was raised, with the latest coach action on it.

**Implemented with these gaps** until the schema changes below land: `position`, `baseline`, `assessment`,
`latestAction`, and the workout's `tiredness`/`muscleSoreness` are always `null`; morning `symptoms` are always `[]`.
“Today” is the server's time zone.

### `GET /api/teams/{teamId}/alerts?status=RESOLVED&limit=20`

Newest first. `status` filters by `OPEN` / `ACKNOWLEDGED` / `RESOLVED`.

```json
[
  {
    "id": "…", "athleteId": "…", "athleteName": "Liam Smith",
    "status": "RESOLVED", "createdAt": "2026-10-02T16:02:00Z", "riskStatus": "RED",
    "reasons": [{ "kind": "SAFETY_SYMPTOM", "symptoms": ["HEADACHE"], "source": "MORNING_CHECKIN" }],
    "latestAction": {
      "id": "…", "athleteId": "…", "alertId": "…", "action": "REVIEWED_WITH_ATHLETE",
      "notes": "Headache resolved.", "coachName": "Coach Rivera", "createdAt": "2026-10-02T17:00:00Z"
    }
  }
]
```

### `GET /api/teams/{teamId}/activity?limit=50`

The team’s audit trail, newest first. Four event types:

```json
[
  { "id": "…", "type": "ALERT_RAISED", "createdAt": "…", "athleteId": "…", "athleteName": "Alex Johnson",
    "riskStatus": "RED", "reasons": [{ "kind": "SAFETY_SYMPTOM", "symptoms": ["HEADACHE", "DIZZINESS"], "source": "WORKOUT_CHECKIN" }] },
  { "id": "…", "type": "MORNING_CHECKIN", "createdAt": "…", "athleteId": "…", "athleteName": "Alex Johnson" },
  { "id": "…", "type": "WORKOUT_CHECKIN", "createdAt": "…", "athleteId": "…", "athleteName": "Alex Johnson",
    "durationMinutes": 78, "rpe": 10 },
  { "id": "…", "type": "COACH_ACTION", "createdAt": "…", "athleteId": "…", "athleteName": "Olivia Davis",
    "action": "MODIFIED_TRAINING", "notes": "Reduced sprint volume.", "coachName": "Coach Rivera" }
]
```

### `POST /api/athletes/{athleteId}/actions`

Records what the coach did. **Append-only** — actions are never edited or deleted.

```json
{ "action": "CONTACTED_GUARDIAN", "notes": "Called Alex’s mum; resting today.", "alertId": "…" }
```

`notes` and `alertId` may be `null`. Responds `201` with the saved action
(`{ id, athleteId, alertId, action, notes, coachName, createdAt }`). When `alertId` points at an `OPEN` alert, set it
to `ACKNOWLEDGED` (`acknowledged_by`, `acknowledged_at`).

### `GET /api/athletes/{athleteId}/today`

```json
{
  "morningDone": false,
  "workoutDone": false,
  "lastSevenDays": [true, true, true, true, true, true, false],
  "coachFollowUp": { "coachName": "Coach Rivera" }
}
```

`lastSevenDays` is oldest first and ends with today. `coachFollowUp` is set while the athlete has an open
high-priority alert (the athlete sees “Coach Rivera would like a quick chat before training today”). It never
includes the reason or any score.

### `GET /api/athletes/{athleteId}/checkins?days=7`

Newest first, one entry per day: `{ "date": "2026-10-05", "morning": MorningCheckin | null, "workout": WorkoutCheckin | null }`.

### `POST /api/athletes/{athleteId}/morning-checkins`

```json
{ "sleepQuality": 4, "fatigue": 3, "muscleSoreness": 2, "overallWellness": 4, "symptoms": ["NAUSEA"] }
```

All scores 1–5. `symptoms` is empty when the athlete chose “None of these”. Responds `201` with the saved check-in.

### `POST /api/athletes/{athleteId}/workout-checkins`

```json
{
  "rpe": 8, "durationMinutes": 75, "tiredness": 4, "muscleSoreness": 3,
  "preWeightKg": 64.2, "postWeightKg": 63.4, "symptoms": []
}
```

`rpe` 1–10, `tiredness` and `muscleSoreness` 1–5, weights optional. Responds `201`.

## Enums

| Name | Values |
|---|---|
| `SymptomCode` | `HEADACHE`, `DIZZINESS`, `NAUSEA`, `LIGHT_SENSITIVITY`, `BALANCE_PROBLEMS`, `CONFUSION` |
| `CoachActionCode` | `REVIEWED_WITH_ATHLETE`, `MODIFIED_TRAINING`, `REMOVED_FROM_TRAINING`, `CONTACTED_GUARDIAN`, `REFERRED_TO_MEDICAL`, `OTHER` |
| `RiskStatus` | `GREEN` (Normal), `YELLOW` (Needs review), `RED` (High priority) |
| `AlertStatus` | `OPEN`, `ACKNOWLEDGED`, `RESOLVED` |
| `MemberRole` | `HEAD_COACH`, `ASSISTANT_COACH`, `ATHLETE` |
| `UserRole` | `ATHLETE`, `COACH`, `ADMIN` (matches `ck_users_role`) |

## Signal engine and `reason_codes`

The rules come from the design handoff and are implemented and unit-tested in
[`frontend/src/domain/signals.ts`](../frontend/src/domain/signals.ts) — port them (and the tests) to the server so both
agree. Everything is relative to the athlete’s **own** baseline:

- **Safety symptom** → `RED`: any symptom from the safety list.
- **Recovery** → `YELLOW`: fatigue or muscle soreness ≥ 2 above baseline, or wellness ≥ 2 below.
- **Training load** → `YELLOW`: latest session load ≥ 15% above the recent baseline mean.
- Until a baseline exists, only safety symptoms flag. The thresholds are placeholders to be reviewed by a qualified
  sports-medicine professional before launch; record the rules version in `engine_version`.

Store the reasons in `risk_assessments.reason_codes` as a JSON **array** (the default is currently `'{}'::jsonb`;
`'[]'::jsonb` would match). One element per reason; a recovery reason per metric:

```json
[
  { "kind": "SAFETY_SYMPTOM", "symptoms": ["HEADACHE", "DIZZINESS"], "source": "WORKOUT_CHECKIN" },
  { "kind": "RECOVERY", "metric": "FATIGUE", "value": 5, "baseline": 2.0 },
  { "kind": "TRAINING_LOAD", "loadAu": 780, "baselineLowAu": 500, "baselineHighAu": 650, "changePct": 35.7 }
]
```

## Schema changes the design needs

The design handoff is the agreed product spec; these are the gaps between it and the current migrations
(`001`–`008`). Suggested as new Liquibase changesets (`009+`).

| Change | Why |
|---|---|
| All six symptoms on **both** check-ins: add `nausea`, `balance_problems`, `confusion` to `workout_checkins`, and all six to `morning_checkins` (or a `symptoms TEXT[]` column on each) | The safety check ends both check-ins and lists six symptoms |
| `workout_checkins`: `tiredness SMALLINT` and `muscle_soreness SMALLINT` (1–5), optional `session_id` | The post-training flow asks both; sessions group check-ins |
| New `coach_actions` table: `id`, `athlete_id`, `alert_id` (nullable), `coach_id`, `action VARCHAR(40)`, `notes TEXT`, `created_at` — insert-only | The append-only follow-up history and audit trail |
| `teams`: `age_group`, `training_frequency`, `join_code` (unique) | Team setup wizard; athletes join with a code |
| `athlete_profiles`: `position`, `guardian_name`, `guardian_phone` | Shown across the coach app and the athlete profile |
| `team_members.member_role`: check constraint for `HEAD_COACH`, `ASSISTANT_COACH`, `ATHLETE` | “Head coach” labels and who can see answers |
| New `sessions` table: `id`, `team_id`, `starts_at`, `type`, `duration_minutes` | Training screen and athlete schedule |
| `risk_assessments.reason_codes` default `'[]'::jsonb` | Reasons are a list |

## Phase 2 — later

The web app shows sample data for these (marked on screen in API mode) until they exist:

- **Sessions and schedule:** `GET /api/teams/{teamId}/sessions`, `GET /api/sessions/{sessionId}` (athletes, duration,
  RPE, load per session).
- **Team trends:** `GET /api/teams/{teamId}/trends?days=7|14|30` (daily team averages and check-in completion).
- **Reports:** `GET /api/teams/{teamId}/reports/{kind}?from=&to=` for weekly wellness, training load, safety alerts,
  check-in completion and follow-up history.
- **Settings:** `PATCH /api/teams/{teamId}`, protocol document upload, notification and escalation preferences.
- **Team setup and joining:** `POST /api/teams`, `POST /api/teams/join` with a code, adding athletes (manually or CSV).
- **Reminders:** `POST /api/teams/{teamId}/reminders` (“Send reminder to team”).
- **Auth:** sign in and out for coaches and athletes, role checks on every endpoint.
