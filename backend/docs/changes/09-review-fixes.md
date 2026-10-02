# Step 9 — Fixes from the October 2026 review

A full review of the backend, the app and the site turned up one account
takeover, two ways to lose or delete other people's data, and a set of smaller
faults. This step fixes them. Each section says what was wrong, what changed,
and how it is tested.

**Before deploying:** run `prisma migrate deploy` (one new migration, below),
deploy with the updated `scripts/deploy-manual.sh`, and ship a new app build —
the server changes are compatible with the current app, but three of the fixes
are on the phone.

---

## Accounts

### Sign-up could take over a Google account

`signUp` refused an address only if it already had a password. For a Google-only
account it `upsert`ed onto the existing user, attached the caller's password and
handed back a session — and reset the account's permit to `USER` on the way.
Anyone who knew an address could sign in as its owner.

Sign-up now only ever creates an account. An address that exists answers 409:
`error.emailTaken` for a password account, `error.emailUsesGoogle` for a Google
one.

The reverse ("pre-hijacking") is closed too: someone could register a stranger's
address with a password and wait for its owner to arrive through Google, keeping
access to the merged account. `User.emailVerifiedAt` now records that the owner
proved the address — through Google, or by completing a password reset. When
Google is linked to an account whose address was never proved, its password and
every session are removed, and the owner is told so (`auth.googlePasswordRemoved`).

### Refresh tokens: a lost response signed people out everywhere

Rotation deleted the old session, so a phone that sent a refresh and lost the
answer (a timeout, the app killed) came back with a token the server had no
record of — which it treated as a replay and revoked every session.

The old session is now kept, revoked and marked `rotatedAt`. Presented again
within `REFRESH_REUSE_GRACE_MS` (60 s) it is an interrupted exchange and gets a
fresh pair; after that it is a replay and ends every session. A token with no
record at all is simply refused.

### Sign-out, password change

- `POST /auth/sign-out` takes the device's `refreshToken` and ends that session
  only. Without it (older app builds) it still ends all of them.
- `PATCH /auth/change-password` now signs out every other session and returns a
  new session for the device that made the change; the app stores it.

### Removed

- The browser OAuth flow (`GET /auth/google`, `/auth/google/callback`). Nothing
  used it, and its callback returned tokens as JSON to a browser tab. Its
  settings (`GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URL`, `GOOGLE_SCOPES_API`,
  `GOOGLE_OAUTH2_*`) are gone with it.
- The emailed reset link. It pointed at a page the site never had.
  `POST /auth/forgot-password` now sends a code, like `/forgot-password/code`.
- A Google id token is accepted only when it says `email_verified: true`; one
  that leaves the claim out used to pass.

---

## Data

### Renaming a route deleted its stops

`PUT /road/update/:id` treated a missing `stops` list as an empty one. A rename
without stops emptied the route; a unit test had pinned exactly that. The app
avoided it by re-sending its cached stops — which overwrote stops added on
another device.

A missing `stops` now leaves the stops alone; an empty list still clears them.
The app no longer sends stops when it renames.

### Anyone could delete anyone's avatar

`photo` was a free-text field on `POST /user/update`. Setting it to another
person's avatar path (public in search results) and then uploading a photo made
the server delete their file. `photo` is no longer accepted there — only an
upload sets it — and `removeAvatar` only touches paths under `/api/user/photo/`.

### Deleted routes

- A route its owner deleted stayed readable, stops and all, to anyone who had
  favourited it. Favourites still keep a link-shared route readable, but not a
  deleted one.
- `RoadOwnerGuard` treats a deleted route as gone: it can no longer be edited,
  given stops, or made public again.
- Deleted routes were never erased. They now are, 30 days after deletion (see
  Retention). The KVKK notice and the privacy page say so.

---

## Retention

`src/retention/retention.service.ts` runs at start-up and daily, and removes:

| What | When |
| --- | --- |
| Usage events | after 730 days (moved here from `UsageRecorder`) |
| Sessions | once expired; signed-out ones after a day |
| Password resets | a day after they expire, unless holding a lockout |
| Deleted routes | 30 days after deletion, with their stops and favourites |
| Deletion log + consent trail | three years after the deletion, as the notice promises |

Every step is idempotent, so instances running it side by side do no harm.

---

## Operations

- **Rate limits were per proxy, not per person.** Without `trust proxy`, every
  request behind Cloud Run came from the same address. `TRUST_PROXY` (default
  0) sets the number of proxies; the deploy sets it to 1. *Check after the
  first deploy that the logs show client addresses.*
- **Work after the response stalled.** Cloud Run throttles the CPU once a
  response is sent, so e-mails to followers and usage writes could stall or be
  lost. The deploy now uses `--no-cpu-throttling` (billed per instance
  lifetime; it still scales to zero).
- **Followers were e-mailed on every re-publish**, and all at once. A route is
  now announced once (`Road.announcedAt`), and mail goes out over a pool of
  three SMTP connections.
- **Database errors under Prisma 7.** The PrismaPg adapter reports a unique
  violation from raw SQL as `P2010` with the SQLSTATE nested in
  `meta.driverAdapterError`, and one raised at COMMIT (the deferred
  `(roadId, order)` constraint) as a bare `DriverAdapterError`. The exception
  filter read neither, so both were 500s; they are 409s again.
- **Deploy script:** the plain settings it needs are checked before anything is
  built; unset optional ones are skipped instead of aborting under `set -u`;
  quote escaping works on bash before 4.3; a multi-line value is refused rather
  than silently folded; `AUDIT_HASH_KEY` is checked with the other secrets.
- **Dependencies:** NestJS 10 → 11 (Express 5), nodemailer 7 → 10,
  google-auth-library 9 → 10, and `mysql2` (inside the Prisma CLI) pinned to a
  patched version. `npm audit --omit=dev` is left with `deepmerge-ts` inside
  Prisma's config loader, which only reads `prisma.config.ts`.

---

## Messages

Following an author answered in English to everyone, the reorder error and the
along-route search validation were English sentences, and the app's "routes
saved" toasts were hard-coded. All go through the locale files now.

---

## Tests and CI

- Two e2e suites (`authorization`, `responses`) and all three integration suites
  had not compiled since the `WayPoint` → `Stop` rename, and the integration
  suites were silently skipped. All are ported; the integration suites run the
  raw SQL (`getOwnRoads`, the stop writes, the deferred constraint, retention)
  against Postgres.
- `npm run typecheck` and `npm run lint:check` cover `test/` as well as `src/`
  (`tsconfig.lint.json`), so a suite that stops compiling fails there.
- `.github/workflows/ci.yml` runs, on every push and pull request: the backend's
  type check, lint, format check, unit, e2e, migrations on an empty Postgres,
  integration and build; the app's type check, lint and tests; the site's build.
- The app gained ESLint (`eslint-config-expo`). The React Compiler diagnostics it
  reports for existing components are warnings for now — those components work,
  the compiler just leaves them unoptimised — to be refactored one at a time.

---

## Migration

`20261002090000_session_rotation_and_email_verification` adds
`Session.rotatedAt`, `User.emailVerifiedAt` and `Road.announcedAt`, and
backfills: accounts linked to Google count as verified, routes public today
count as announced.
