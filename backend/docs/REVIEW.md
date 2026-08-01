# Backend Review — Database, Backend, Authentication, Authorization

Reviewed commit: `2832159` (branch `main`)
Status: **every 🔴 finding is closed** as of step 4. See the progress table at the end.
Scope: `backend/` (NestJS 10 + Prisma 6 + PostgreSQL). The React Native client was read
only to establish which endpoints are in active use, so that fixes stay compatible.

This document is the baseline audit. Each subsequent remediation step gets its own
document under [`docs/changes/`](./changes/), and every finding below is tagged with the
step that resolves it.

---

## Summary

| Severity | Count | Theme |
| --- | --- | --- |
| 🔴 Critical | 9 | 5 exploitable vulnerabilities, 4 features broken in production |
| 🟠 High | 11 | OAuth safety, rate limiting, password hashing, config, bootstrap, Docker |
| 🟡 Medium | 19 | Schema modelling, soft delete, dead code, response consistency |

The architecture is sound: NestJS module boundaries are respected, Prisma is used with
transactions, a global auth guard is in place, and RBAC is table-driven rather than
hardcoded. The problems are concentrated in three places:

1. **Nothing validates input.** Every request DTO is a bare TypeScript `type`, so the
   global `ValidationPipe` has no metadata to work with and is a no-op. This is the root
   cause of the privilege-escalation finding.
2. **Authorization is inconsistent.** Three different mechanisms coexist (global
   `AccessGuard`, ad-hoc `@UseGuards`, `PermissionsGuard` + `@RequirePermission`) with no
   single policy, and the resource-ownership guard reads the wrong route parameter.
3. **The test suite does not compile,** so none of the above was ever caught. 11 of 16
   suites fail to run. Effective coverage is zero and there is no CI.

---

## 🔴 Critical — exploitable

### C1. Password reset token is returned in the HTTP response → account takeover
**Step 4** · `src/auth/service/auth/auth.service.ts:302-308`

`forgotPassword` returns `resetToken` and `resetTokenUrl` in the response body. Any
unauthenticated caller can request a reset for an arbitrary email address and read the
token directly out of the response, then complete the reset. Email delivery is decorative.

Compounding it, `createPasswordResetToken` (`src/auth/helper/helper.service.ts:48-59`)
generates 32 random bytes, hashes them, and then stores **and emails the hash** — the
random pre-image is discarded. The hashing therefore protects nothing: the value in the
database is the value that grants the reset. The neighbouring `hashToken` /
`verifyHashedToken` helpers implement the correct pattern and are never called.

### C2. Mass assignment on `POST /api/user/update` → privilege escalation
**Step 2** · `src/user/user.service.ts:26-33`, `src/user/type/user.type.ts`

```ts
return tx.user.update({ where: { id: userId }, data: { ...body } });
```

`UpdateUser` is a bare `type` with no `class-validator` decorators, and the global
`ValidationPipe` is constructed with no options — no `whitelist`, no
`forbidNonWhitelisted`. The raw request body is spread into the Prisma update, so every
column on `User` is writable by the client:

```http
POST /api/user/update
{ "permitId": "909c9b35-eec3-4afe-a21d-986682659f5a" }
```

That UUID is the `ADMIN` permit, hardcoded in `prisma/seed.ts:20`. Any authenticated user
can promote itself to admin. `email` and `deletedAt` are writable by the same route.

### C3. IDOR on waypoint mutation routes
**Step 3** · `src/common/guards/road-owner/road-owner.guard.ts:17`

```ts
const roadId = req.params.id || req.query.id;
```

The guard is applied to routes whose parameter is `:waypointId`, not `:id`. Supplying
`?id=<a road the caller owns>` satisfies the guard while the service acts on a waypoint
belonging to someone else:

```http
DELETE /api/road/delete-waypoint/<victim-waypoint-id>?id=<attacker-road-id>
PUT    /api/road/update-waypoint/<victim-waypoint-id>?id=<attacker-road-id>
```

`reorder-waypoint` is structurally worse: the guard checks a route parameter that does not
exist, while `reorderWaypoints` (`src/road/services/road/road.service.ts:481`) acts on a
`roadId` taken from the request **body**. The authorized resource and the mutated resource
are different values, so the check cannot be made meaningful without moving it.

### C4. Sign-out does not revoke anything
**Step 4** · `src/auth/service/auth/auth.service.ts:243-276`

`signOut` sets `Tokens.accessToken` and `Tokens.refreshToken` to `null`, but
`refreshToken()` only verifies the JWT signature — it never compares the presented token
against the stored one. A refresh token therefore remains valid until natural expiry
regardless of logout. There is no rotation and no reuse detection.

`ACCESS_EXPIRES_IN` is read via `configService.get()` with no default and no validation
(`src/auth/helper/helper.service.ts:72`); if unset, `jwtService.signAsync` mints a token
with **no expiry claim at all**, making the tokens permanent.

### C5. Unauthorized reads across roads, waypoints, and users
**Step 3**

| Route | Problem |
| --- | --- |
| `GET /api/road/:id` | No ownership check. Any authenticated user reads any road. |
| `GET /api/road/waypoint/:id` | No ownership check. `getWaypointById` accepts `userId` and never uses it (`road.service.ts:115-128`). |
| `GET /api/user/:id` | Returns the entire `User` row — email, `nickName`, `permitId`, timestamps — for any id, with no field selection (`user.service.ts:50-63`). |
| `POST /api/favorites/toggle-road` | Does not verify the road exists or is visible to the caller. The waypoint variant at least does a `findUnique` first. |

---

## 🔴 Critical — broken in production

### C6. `POST /api/auth/refresh-token` can never succeed
**Step 4** · `src/auth/auth.controller.ts:64-69`, `src/app.module.ts:22`

`AccessGuard` is registered as an `APP_GUARD`, and controller-level `@UseGuards` is
*additive*, not a replacement. The route therefore requires a valid **access** token to
pass the global guard and a valid **refresh** JWT in the same `Authorization` header to
pass `RefreshGuard`. A single header cannot satisfy both, so the endpoint always returns
401.

The mobile client sends the access token in the header and the refresh token in the body
(`mobile-react-native/src/store/services/authenticationService.ts:86-90`), so
`RefreshGuard` verifies an access token against `REFRESH_KEY` and fails. Token refresh has
never worked in this codebase.

### C7. Three road endpoints always return 403
**Step 3** · `src/road/road.controller.ts:104-126`

Same root cause as C3. With no `id` route parameter and no `?id=` query string,
`RoadOwnerGuard` throws `ForbiddenException('Missing user or road ID')` unconditionally on
`delete-waypoint`, `update-waypoint`, and `reorder-waypoint`. The mobile client calls all
three (`roadService.ts:194,214,243`).

### C8. `signUp` returns `userId: null` for every new registration
**Step 4** · `src/auth/service/auth/auth.service.ts:160`

```ts
userId: existingUser ? existingUser.id : null,
```

The ternary is inverted with respect to intent: in the normal case (no prior user) it
returns `null`, and in the upsert case it returns the id fetched *before* the write. It
should return the id of the user actually created or updated by the transaction.

### C9. The test suite does not run
**Step 1**

`npm test` on a clean checkout: **11 of 16 suites fail to run, 3 tests fail.**

- Jest has no `moduleNameMapper` for the `src/*` absolute import style the source uses
  throughout → `Cannot find module 'src/prisma/prisma.service'` in every spec that
  transitively imports it.
- Guard specs call `new AccessGuard()` / `new AdminGuard()` with no constructor arguments →
  `TS2554` compile errors.
- `src/app.controller.spec.ts` asserts on `appController.getHello()`, which does not exist,
  on a controller that is not registered in `AppModule`.
- `test/app.e2e-spec.ts` asserts `GET /` returns `'Hello World!'`; no such route exists.

There is no `.github/` directory, so nothing gates this. Every finding in this document
was reachable by a test that was never written.

---

## 🟠 High

### H1. Google OAuth: no CSRF protection, unverified email trust, wrong tokens returned
**Step 5** · `src/auth/service/google/google.service.ts`, `auth.service.ts:346-425`

- `generateAuthUrl` omits the `state` parameter, so the callback is open to OAuth CSRF —
  an attacker can force a victim to link the attacker's Google account.
- `verified_email` is present on the `GoogleAuthClient` type (`auth.types.ts:38`) and never
  checked. `signInWithGoogle` links a Google identity to an existing local account **by
  email alone**, so an unverified Google account bearing a victim's address takes over that
  account.
- The callback returns **Google's** `access_token` / `refresh_token` to the client as if
  they were application session tokens (`auth.controller.ts:105-109`). The client cannot
  authenticate against this API with them, and third-party credentials are leaked into the
  app. `signInWithGoogle` also persists them in the application `Tokens` table.
- `GOOGLE_SCOPES_API` is read and `.split(',')` called on a possibly-`undefined` value.

### H2. No rate limiting anywhere
**Step 4** · `@nestjs/throttler` is not a dependency

`sign-in`, `sign-up`, and `forgot-password` are unthrottled: credential stuffing, account
enumeration at scale, and outbound mail flooding via C1 are all unconstrained.

### H3. Password hashing is timing-leaky and unversioned
**Step 4** · `src/auth/helper/helper.service.ts:35-46`

- `buf.toString('hex') === hash` is a non-constant-time comparison. Use
  `crypto.timingSafeEqual` on buffers.
- scrypt runs at library defaults with no cost parameters encoded in the stored hash, so
  cost can never be raised and migration to argon2id would invalidate every password. Store
  a versioned encoding (`scrypt$N=…,r=…,p=…$salt$hash`).
- No maximum password length. An arbitrarily long password is a CPU exhaustion vector.

### H4. User enumeration on sign-in and forgot-password
**Step 4** · `auth.service.ts:173` / `:281`

`signIn` returns `404 User not found` for an unknown address and `401 Invalid password`
for a wrong password, distinguishing the two. `forgotPassword` returns `404` for unknown
addresses. Both should be uniform.

### H5. `resetPassword` ignores `confirmPassword` and leaves sessions live
**Step 4** · `auth.service.ts:311-344`

`ResetPassword` carries `confirmPassword`; nothing compares the two fields. There is no
password policy on any route. After a reset, existing access and refresh tokens remain
valid. `passwordChangedAfterToken()` (`helper.service.ts:107`) implements exactly the
needed check, is called by nothing, and has no `passwordChangedAt` column to read.

The token consumption is also a TOCTOU: the read filters on
`passwordResetTokenExpiry: { gte: now }`, but the subsequent `update` filters on
`resetToken` alone (`:328-330`). It should be one atomic conditional write.

### H6. Configuration is never validated
**Step 1**

`ConfigModule.forRoot()` is repeated in five modules instead of being registered once with
`isGlobal: true`. No schema validates that `ACCESS_KEY`, `REFRESH_KEY`, `ACCESS_EXPIRES_IN`,
`REFRESH_EXPIRES_IN`, or `ROAD_SHARE_KEY` are present, so a missing secret surfaces as a
request-time 500 rather than a boot failure — or, for the expiry values, as silently
non-expiring tokens (C4).

`.env.example` omits twelve variables the code reads: `FRONTEND_URL`, `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URL`, `GOOGLE_SCOPES_API`, `ROAD_SHARE_KEY`,
`ROAD_SHARE_EXPIRE_IN`, `RESET_KEY`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_FROM`, `PORT`. It
lists `CREATE_TABLES`, which nothing reads.

### H7. `main.ts` performs no hardening
**Step 1** · `src/main.ts` (11 lines)

No `helmet`, no CORS policy, no global route prefix (every controller hardcodes `api/`), no
global exception filter, no request logging, no `enableShutdownHooks()` (so Prisma
connections are not closed cleanly on SIGTERM), and the port is hardcoded to `3000`
ignoring `PORT`. `ValidationPipe` is registered with no options.

### H8. Bare `Error` throws convert 401s into 500s
**Step 3** · `access.strategy.ts:25`, `refresh.strategy.ts:26`, `auth.controller.ts:58`

Throwing `Error` from a Passport `validate()` or a controller produces a 500. These should
be `UnauthorizedException`. The checks are also redundant:
`ExtractJwt.fromAuthHeaderAsBearerToken()` has already guaranteed the header shape by the
time `validate` runs, so the only observable effect of this code is degrading correct 401s
into 500s.

### H9. `FavoritesService` swallows every error and returns HTTP 200
**Step 6** · `src/favorites/favorites.service.ts:62-92`, `:129-146`

The catch block absorbs everything — including `NotFoundException` and unknown
infrastructure errors — and returns `200 OK` with `status: 'error'` in the body. Clients
cannot distinguish success from failure by status code, and genuine failures are invisible
to monitoring. `UserService.updateUser`'s try/catch rethrows in both branches and is a
no-op.

### H10. Dockerfile bakes secrets into an image layer
**Step 6** · `backend/Dockerfile:12`

`COPY .env ./` embeds live secrets in the image, recoverable from the layer even if a later
stage deletes the file. The image also runs `npm run start:dev` as root with `npm install`
rather than `npm ci`, and there is no multi-stage production target.
`docker-compose.yml` hardcodes the database password.

### H11. `@prisma/internals` shipped as a runtime dependency
**Step 1** · `package.json`

`@prisma/internals` is a heavyweight, unstable internal package. Nothing in `src/` imports
it. It should not be in `dependencies`.

---

## 🟡 Medium — database and schema

### D1. Session tokens stored in plaintext, one row per user
**Step 5** · `prisma/schema.prisma:43-60`

`Tokens.accessToken` and `Tokens.refreshToken` hold raw JWTs. A database disclosure hands
over every live session. Persisting the **access** token buys nothing at all — it is never
read for verification — and doubles the blast radius.

`Tokens.userId` is `@unique`, so there is exactly one session per user: signing in on a
second device silently invalidates the first. A `Session` table keyed by
`(userId, sessionId)` storing only a **hash** of the refresh token is the correct shape.

### D2. Soft delete is decorative
**Step 5**

All ten models carry `deletedAt`, and almost no query filters on it — `findUserByEmail`,
`road.findUnique`, `wayPoint.findUnique`, and `permit.findMany` all ignore it. So a
soft-deleted user can still sign in. Meanwhile `deleteRoadById`
(`road.service.ts:269-301`) performs a **hard** delete, contradicting the columns entirely.

Either commit to soft delete via a Prisma client extension that filters every read, or drop
the columns. The current half-state is worse than either.

**Resolved in step 5 by dropping the columns.** A grep settled it: nothing in the
codebase ever *wrote* `deletedAt`, so it was NULL in every row of every table and the
six filters matched everything. Removing it loses no data. See
[05-schema.md](./changes/05-schema.md#d2--soft-delete-removed).

### D3. Nullable owner columns with `onDelete: SetNull` create unauthorizable orphans
**Step 5** · `schema.prisma:124-125,144-145`

`Road.userId` and `WayPoint.roadId` are nullable. Deleting a user leaves roads with no
owner; deleting a road leaves waypoints with no road. Neither can subsequently be listed,
authorized, or cleaned up. Waypoints should cascade with their road, and roads should
cascade with their user. This nullability is also why `road.userId !== user.userId` in
`RoadOwnerGuard` is fragile — `null !== undefined` is `true`.

### D4. Redundant `Tokens ↔ ManuelAuth ↔ GoogleAuth` relation triangle
**Step 5** · `schema.prisma:14-60`

`Tokens.userId`, `ManuelAuth.tokenId`, and `GoogleAuth.tokenId` are all `@unique`, giving
three navigation paths to one row and three places for them to disagree. `refreshToken()`
resolves `manuelAuth?.tokenId ?? googleAuth?.tokenId` where `Tokens.userId` would do
directly.

`resetToken` and `passwordResetTokenExpiry` also live in this table, coupling two unrelated
lifecycles: `signOut` clears the session columns and leaves a live reset token behind.

### D5. `AddressInfo` is modelled many-to-one but used one-to-one
**Step 5** · `schema.prisma:160-173`

Each waypoint creates its own `AddressInfo`, yet the relation permits sharing via
`addressInfoId` connect, and `deleteRoadById` deletes addresses by id
(`road.service.ts:287-291`). If two waypoints ever share an address, deleting one road
destroys another road's data. Either make the relation 1:1 and owned, or deduplicate
deliberately and never delete by id.

### D6. Case-sensitive email uniqueness and duplicated email columns
**Step 5**

Postgres `@unique` is case-sensitive, so `Foo@x.com` and `foo@x.com` are two accounts.
`ManuelAuth.email` and `GoogleAuth.email` duplicate `User.email` with no constraint keeping
them in sync — `signUp`'s upsert and `resetPassword` can leave them divergent. Normalize on
write, or use `citext`.

### D7. Migration history is unusable as a record of intent
**Step 5** · `prisma/migrations/`

68 migrations, including `deneme`, `deneme2`, `update_favorites_2` … `_12`, and
`favorite_fix` seven times. Several contain `DROP COLUMN`. No reviewer can determine what
any given migration was for. Going forward: one migration per intent, named for the intent.

### D8. RBAC seed belongs to a different product
**Step 5** · `prisma/seed.ts`

Seeded permissions are `CREATE_PRODUCT`, `APPROVE_PRODUCT`, `UPDATE_PRODUCT`, and a
`SELLER` permit — template leftovers unrelated to road planning. Permit UUIDs are hardcoded,
and `permit.create` (rather than `createMany({ skipDuplicates })`) throws on re-seed, so the
seed is not idempotent. `Permit` vs `Permission` is also a confusing pair of names for
role vs grant.

### D9. Waypoint ordering has no constraint and is rewritten row-by-row
**Step 6**

`WayPoint.order` has no `@@unique([roadId, order])`, so duplicates and gaps are
representable. Reordering issues N individual `UPDATE`s via `Promise.all` inside a
transaction — which serializes anyway and invites deadlocks. The same N+1 pattern appears in
`createRoad` (`:36-59`), `updateRoadById` (`:186-242`), `addWaypointToRoad` (`:353-360`), and
`deleteWaypointById` (`:389-396`). A single ordered `UPDATE … FROM (VALUES …)` replaces all
of them.

### D10. No pagination on collection endpoints
**Step 6**

`getOwnRoads`, `getPermits`, and `getAllFavorites` return unbounded result sets with deep
`include` trees. `getAllFavorites` additionally runs four queries that differ only by an
own-vs-others predicate; two could be one query partitioned in code.

---

## 🟡 Medium — design and dead code

### Q1. The JWT payload is completely untyped
**Step 4** · `src/auth/type/auth.types.ts:33-34`

```ts
export type AccessTokenType = {};
export type RefreshTokenType = {};
```

Empty object types accept any object, so `createAccessToken(data)` has no contract. It is
currently called with the full Prisma `Permission[]` — each with `id`, `createdAt`,
`updatedAt`, `deletedAt` — bloating every token. `PermissionsGuard` then re-reads
permissions from the database anyway, so the embedded copy is never used. Neither token
carries `jti`, `aud`, or a type claim, so there is no revocation handle and nothing
structurally prevents replaying one token class as the other.

### Q2. `PermissionsGuard` cannot be used class-wide and 500s without a user
**Step 3** · `src/common/guards/permissions/permissions.guard.ts`

`reflector.get('permission', context.getHandler())` ignores class-level metadata, so
`@RequirePermission` only works per-handler. `request.user.userId` is dereferenced with no
null check, so applying the guard to a `@Public()` route throws `TypeError` → 500. It does
fail closed when metadata is absent (`some(p => p.name === undefined)` is `false`), which is
the right default but happens by accident rather than by intent.

### Q3. `AdminGuard`'s inheritance is inert
**Step 3** · `src/common/guards/admin/admin.guard.ts`

It extends `AuthGuard('jwt-access')` but overrides `canActivate` without ever calling
`super.canActivate`, so it performs no authentication itself and silently depends on the
global guard having populated `req.user`. It dereferences `user.userId` unguarded. Either
call `super`, or make it a plain `CanActivate` that reads `req.user` defensively.

### Q4. Dead code that reads like security
**Step 3**

Verified as registered in no module and reachable from nothing:

| Symbol | Note |
| --- | --- |
| `GoogleGuard` | `canActivate` returns `true` unconditionally — looks like protection, is none |
| `ResetGuard`, `ResetStrategy` | Never provided. `ResetStrategy` also reads the token from a **query parameter**, which leaks it into logs and `Referer` headers |
| `Roles` decorator | Superseded by `RequirePermission` |
| `FileManagementService` | Unsanitized `join(cwd, '../uploads/' + name)` — path traversal the moment it is wired up; also throws bare `Error` |
| `AppController`, `AppService` | Empty stubs; `AppController` is not even in `AppModule`'s `controllers` |

### Q5. Response envelope is duplicated in 20+ methods, inconsistently
**Step 6**

The `{ status, header, message, data }` shape is constructed by hand in nearly every service
method, and three places break it: `shareRoadByIdWithToken` returns a bare string,
`getPermits` returns a bare array, and `refreshToken` returns `{ data }` only. This belongs
in one global interceptor.

### Q6. `updatePermitById` is an empty function
**Step 6** · `src/permissions/permissions.service.ts:49`

`async updatePermitById(updatePermit: UpdatePermit) {}` — the route
`POST /api/permissions/permit/update-id` returns `200` with an empty body and silently does
nothing.

### Q7. Assorted
- `tsconfig.json` is not strict: `strict`, `strictPropertyInitialization`, `noUnusedLocals`,
  `noImplicitReturns` are all off. **Step 1**
- `deleteRoadById` re-checks `{ id, userId }` and `return`s silently when the road is not
  the caller's, then reports `'Road deleted successfully'` for a road it did not delete.
  **Step 3**
- `reorderWaypoints` does not bounds-check `from` / `to`; an out-of-range `from` makes
  `waypoints[from]` `undefined`, then `splice(to, 0, undefined)` and `wp.id` throws → 500.
  **Step 2**
- User-facing strings mix Turkish and English (`'Bu kullanıcı zaten kayıtlı.'`,
  `user-exists.guard.ts:22`; Turkish comment at `schema.prisma:49`). **Step 6**
- `common/decorators/index.ts` re-exports only `public.decorator`, so `GetUser` and
  `RequirePermission` are imported by deep path in some files and via the barrel in others.
  **Step 3**
- `POST /api/road/share/:token` is a `POST` for a read operation, and the share token grants
  access for its full TTL with no revocation path. `routeToSharedRoad` returns the raw road
  including `userId`. **Step 6**
- `README.md` is the unmodified NestJS template. No architecture, API, environment, or
  runbook documentation exists. **Step 1**

---

## Remediation plan

| Step | Scope | Findings closed |
| --- | --- | --- |
| **1** | Test harness, config validation, bootstrap hardening, CI | C9, H6, H7, H11, Q7 |
| **2** | `class-validator` DTOs on every route | **C2**, Q7 (bounds) |
| **3** | Authorization: ownership guards, dead-guard removal | **C3**, **C5**, **C7**, H8, Q2, Q3, Q4 |
| **4** | Authentication: reset-token leak, refresh rotation, revocation, throttling | **C1**, **C4**, **C6**, **C8**, H2, H3, H4, H5, Q1 |
| **5** | Schema: session model, soft delete, cascades, OAuth | H1, D1–D8 |
| **6a** | Response envelope, global exception filter, API consistency, health | **H9**, **Q5**, **Q6**, Q7 (i18n, shared road) |
| **6b** | N+1 waypoint writes, waypoint order integrity, pagination, Docker | H10, D9, D10 |

Steps 1–4 close every 🔴 finding. Response shapes stay compatible with the existing React
Native client throughout, with one deliberate exception: `resetToken` and `resetTokenUrl`
are removed from the `forgot-password` response, since returning them *is* C1.

## Progress

| Step | Status | Closed |
| --- | --- | --- |
| [1 — Foundation](./changes/01-foundation.md) | done | C9, H6, H7, H11, Q7 (tsconfig), Q1 (typing) |
| [2 — Request validation](./changes/02-request-validation.md) | done | **C2**, Q7 (bounds), H5 (partial) |
| [3 — Authorization](./changes/03-authorization.md) | done | **C3**, **C5**, **C7**, H8 (partial), Q2, Q3, Q4, H9 (partial) |
| [4 — Authentication](./changes/04-authentication.md) | done | **C1**, **C4**, **C6**, **C8**, H2, H3, H4, H5, H8, Q1 |
| [5 — Schema](./changes/05-schema.md) | done | H1, D1–D8 |
| [6a — API contract](./changes/06-api-contract.md) | done | **H9**, **Q5**, **Q6**, Q7 (i18n, shared road) |
| [6b — Writes and limits](./changes/06b-writes-and-limits.md) | done | **H10**, **D9**, **D10** |

**Every finding in this review is now closed.**

Verification at the end of step 6b: 661 unit tests across 28 suites, 106 e2e tests
across 6 suites, 62 integration tests against a real Postgres 16,
format/lint/typecheck/build clean, 60 migrations applying to an empty database with no
schema drift, seed idempotent. At the start, 11 of 16 suites failed to run.

Four defects surfaced while implementing step 6 that were not in this review.

Two in 6a, both because typing the envelope made them visible:

- **`signInWithGoogle` returned `userId` at the top level of the envelope**, beside
  `status`/`header`/`message` — a slot the client never reads, duplicating a value
  already inside `data`. An inferred object literal accepted the stray key; the typed
  `ok()` helper does not.
- **`POST /auth/sign-up` answered 500 for a malformed or absent `email`.**
  `UserExistsGuard` runs before the pipes and passed the raw body value to
  `findUnique`; Prisma throws on a non-scalar unique selector. It should have been the
  400 that `SignUpDto` would have produced.

And two in 6b, both found by tests written for the change rather than by review:

- **A deferred constraint violation was a 500.** Prisma reports a failing raw statement
  as `P2010` with the SQLSTATE in `meta.code`, and only recognises a commit-time unique
  violation as `P2002` when the commit happens inside `$transaction`. The exception
  filter now reads `meta.code`. Only a real database raises this, because only a real
  database has a deferred constraint.
- **A blank `?limit=` switched pagination off.** The first `PaginationQueryDto` returned
  `undefined` for a blank value and leaned on `@IsOptional()`, which discarded the
  property default — so `take` reached Prisma as `undefined`, meaning no limit at all.
  A safety mechanism that turns itself off on an empty query parameter is worse than
  not having one.

And one found by reading the change against the client rather than by a test:

- **`updateRoadById` discarded address edits from the shipped client.**
  `DraggableList.tsx` builds its payload as `{...waypoint}`, so each entry carries the
  waypoint's own `addressInfoId` beside its `address`. `addressInfoId` won
  unconditionally, so an edit arriving that way named the address it was editing and
  was dropped. Pre-existing, and preserved through the bulk rewrite before being
  fixed.
