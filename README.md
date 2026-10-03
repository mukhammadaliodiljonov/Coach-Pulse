# Coach-Pulse

## Backend JWT configuration

Set `JWT_SECRET` to a random value with at least 32 bytes before starting the
Spring Boot application. Generate a value with:

```bash
export JWT_SECRET="$(openssl rand -base64 32)"
```

JWTs use HS256 and expire after 15 minutes by default. Set
`app.security.jwt.expiration` to another ISO-8601 duration to change the
lifetime. Tokens contain only the subject, issued-at time, and expiration time.
Bearer tokens are validated by Spring Security; endpoint authorization will be
added separately.

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
