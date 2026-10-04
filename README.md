# Coach-Pulse

## Backend JWT configuration

Set `JWT_SECRET` to a random value with at least 32 bytes before starting the
Spring Boot application. Generate a value with:

```bash
export JWT_SECRET="$(openssl rand -base64 32)"
```

JWTs use HS256 and expire after 15 minutes by default. Set
`app.security.jwt.expiration` to another ISO-8601 duration to change the
lifetime. Tokens contain only the subject (user ID), the user's `role`, the
issued-at time, and the expiration time.

## Protected endpoints

Every API route requires a valid JWT in the `Authorization: Bearer <token>`
header, except `POST /api/auth/register`, `POST /api/auth/login`, and
`POST /api/auth/logout`. The token's signature, expiration, and `role` claim are
verified before the request reaches a controller. Missing, malformed, tampered,
expired, or wrongly signed tokens return `401` with a `WWW-Authenticate: Bearer`
header. Tokens in query parameters or form bodies are not accepted, and public
auth endpoints ignore any bearer token so a stale one cannot block login.

Controllers read the verified identity from the authentication context, for
example `@AuthenticationPrincipal Jwt jwt` and `jwt.getSubject()` for the user
ID. Never take the user ID or role from request bodies, headers, or parameters.

## Role authorization

Role permissions are enforced on the server with method security. Annotate a
controller method with the roles allowed to call it:

```java
@PreAuthorize("hasRole('COACH')")
@PreAuthorize("hasAnyRole('COACH', 'ADMIN')")
```

Roles come only from the verified JWT. There is no role hierarchy, so `ADMIN`
does not automatically get `COACH` or `ATHLETE` permissions; list every role an
endpoint allows. An authenticated user without an allowed role gets `403` in the
standard Problem Details format; a request with no valid token still gets `401`.
Hiding pages or buttons in the frontend is only for user experience. Every
restricted endpoint must have its own role check on the server.

## User roles

CoachPulse roles are defined in `UserRole`: `ATHLETE`, `COACH`, and `ADMIN`.
They match the `ck_users_role` database constraint, so every user has exactly
one valid role. Login puts the role in the JWT `role` claim. A bearer token
whose role is missing or not one of these exact names is rejected with `401`.
For valid tokens the role is available to authorization logic as the authority
`ROLE_<NAME>` (for example `ROLE_COACH`, usable with `hasRole("COACH")`).

## User registration

`POST /api/auth/register` accepts `email`, `password`, `firstName`, and
`lastName`. Email and names are trimmed, and email is stored in lowercase.
New self-registered accounts receive the `COACH` role; clients cannot choose a
privileged role. Passwords are stored as PBKDF2 hashes and are never included
in the response. Success returns `201 Created`; invalid fields return `400`,
and an email that is already registered returns `409` using the standard
Problem Details response format.

## Login and logout

`POST /api/auth/login` accepts `email` and `password`. Successful login returns
a signed bearer JWT in `accessToken` and its configured lifetime in
`expiresIn` seconds. The token subject is the user's ID; passwords are not
included in its claims. Invalid credentials return `401` with the same generic
message whether the email is unknown or the password is wrong.

`POST /api/auth/logout` returns `204 No Content`. JWTs are stateless, so logout
means the client discards its token; a previously issued token remains valid
until it expires. Clients should remove the token from local storage on logout.

## Teams and the coach dashboard

`GET /api/me` returns the signed-in user, their athlete profile id (athletes
only), and their team memberships.

`POST /api/teams` (COACH or ADMIN) creates a team with `name`, `sport`, and
optional `ageGroup` and `trainingFrequency`. The caller becomes its
`HEAD_COACH`, and the team gets a unique join code such as `D5C-F29T`.

The dashboard reads `GET /api/teams/{teamId}`, `/athletes/today`,
`/alerts?status=&limit=`, and `/activity?limit=` (limits are capped at 100).
These answer `404` unless the caller coaches the team, so team ids cannot be
probed. Formats are in `docs/api-contract.md`. "Today" is the calendar day in
the server's time zone.

## Athletes and check-ins

Athletes cannot self-register. They join with their coach's team code:
`GET /api/auth/join/{code}` (public) shows the team, and `POST /api/auth/join`
(public) creates the `ATHLETE` account, its athlete profile, and the team
membership in one transaction. The role is never taken from the request.

`POST /api/athletes/{athleteId}/morning-checkins` and `/workout-checkins` are
for the athlete only. `GET /api/athletes/{athleteId}/today` and
`/checkins?days=` (up to 60) are for the athlete and their team's coaches;
anyone else gets `404`. `symptoms` is required on both check-ins, so a missing
answer is never stored as "no symptoms".

## Personal baselines

Each athlete's usual wellness scores and training load are calculated live
from their own last 21 days of check-ins (`BaselineService`), and today's
check-ins are compared with them (`DeviationDetector`). The rules and thresholds
are in `docs/baseline-algorithm.md` and `BaselineRules`.

## Risk engine

`RiskEngine` scores the deviations 0–100 and sets the `GREEN`/`YELLOW`/`RED`
status (`docs/risk-model.md`, `RiskRules`). Only a safety symptom can make an
athlete `RED`. Every check-in is assessed when it is submitted and stored in
`risk_assessments` with its score, reasons, and engine version; the dashboard
shows each athlete's latest assessment from today. The score is never sent to
clients. Alerts are not raised from assessments yet.

## Deploying the backend to AWS Elastic Beanstalk

Use the **Java SE** platform (Corretto 17 or newer). It runs the Spring Boot
JAR directly; no WAR is needed.

1. Build: `./mvnw clean package`. This creates `target/demo-0.0.1-SNAPSHOT.jar`.
   The full-application test (`CoachPulseApplicationTests`) only runs when
   `DB_PASSWORD` is set, so the build works without database credentials.
2. Create the environment and upload that JAR.
3. In **Configuration → Updates, monitoring, and logging → Environment
   properties**, set:

   | Property | Value |
   |---|---|
   | `SERVER_PORT` | `5000` (the port Beanstalk's nginx forwards to) |
   | `DB_PASSWORD` | the Supabase database password |
   | `JWT_SECRET` | a random value of at least 32 bytes (`openssl rand -base64 32`) |
   | `CORS_ALLOWED_ORIGINS` | the frontend's exact origin(s), comma-separated, e.g. `https://app.example.com` |

4. With a load balancer, set its **health check path** to `/api/health`.
   Every other route requires sign-in, so the default `/` answers `401`.

On startup the app runs any pending Liquibase migrations against the database.

### The frontend

The JAR contains only the API. Build the web app with the API's URL and host
the `frontend/dist` folder as a static site (for example S3 with CloudFront):

```bash
cd frontend
VITE_API_BASE_URL=https://your-api.example.com/api npm run build
```

The site's origin must be listed in `CORS_ALLOWED_ORIGINS`. The app routes
pages in the browser, so the host must serve `index.html` for unknown paths
(in CloudFront, custom error responses for 403 and 404 returning
`/index.html` with status 200).
