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
