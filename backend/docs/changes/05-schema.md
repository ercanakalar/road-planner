# Step 5 — Schema

Closes **H1** (OAuth: no `state`, unverified email trusted) and **D1**–**D8**.

One migration: `20260730073000_restructure_sessions_and_ownership`. It is destructive
by design in two places, both called out below.

---

## D1, D4 — `Tokens` replaced by `Session` and `PasswordReset`

`Tokens` held the access token, refresh token, reset token and reset expiry in one row
keyed uniquely by `userId`, reachable through three separate unique foreign keys
(`Tokens.userId`, `ManuelAuth.tokenId`, `GoogleAuth.tokenId`). That single shape caused
three unrelated problems:

- **`userId` was unique**, so there was exactly one session per user. Signing in on a
  phone silently signed out a tablet. Nobody would have described that as intended.
- **Sessions and password resets shared a row**, so `signOut` cleared the token columns
  and left a live reset token behind.
- **Three navigation paths to one row** meant three places for them to disagree, and
  `refreshToken()` resolved `manuelAuth?.tokenId ?? googleAuth?.tokenId` where
  `Tokens.userId` would have done.

Now:

```prisma
model Session {
  id               String    @id @default(uuid())
  userId           String
  refreshTokenHash String    @unique   // SHA-256, never the token
  expiresAt        DateTime
  revokedAt        DateTime?
  lastUsedAt       DateTime  @default(now())
  userAgent        String?
}

model PasswordReset {
  id        String    @id @default(uuid())
  userId    String
  tokenHash String    @unique
  expiresAt DateTime
  usedAt    DateTime?
}
```

Both hang off `User` alone. `ManuelAuth.tokenId` and `GoogleAuth.tokenId` are gone.

There is no `accessToken` column anywhere: verification is by signature, so storing one
bought nothing and doubled the blast radius of a disclosure.

`refreshToken()` now looks a session up **by digest** rather than finding the user and
then comparing, and rotation **deletes and re-creates** the row rather than updating it,
so the presented digest cannot survive rotation. A signature-valid token with no
matching session revokes every session for the claimed user — that is either a token
already rotated away or one presented after sign-out, both consistent with replay.

### What the migration does with existing rows

A session is carried forward only when `Tokens.refreshToken` holds a 64-character hex
digest, which is the format written since step 4. Anything else is a raw JWT from
before that change; storing a raw token where a digest belongs would make it
unverifiable, so those sessions end and the user signs in once more.

`expiresAt` on a carried-forward row is set to 30 days because the original expiry was
never recorded. That is not the real bound — the refresh JWT's own `exp` is still
verified on every refresh, so a migrated row cannot outlive its token.

**Reset tokens are deliberately not carried forward.** Before step 4 the stored value
*was* the emailed token, so importing it would preserve a grant that was never safe.
Outstanding reset links stop working; the flow is repeatable.

---

## D2 — soft delete removed

Every model carried a nullable `deletedAt` plus an index on it. The evidence for
removing rather than implementing it:

```
$ grep -rn "deletedAt" src --include=*.ts | grep -v spec
# six `deletedAt: null` filters. Zero writes. Nothing, anywhere, ever set the column.
```

So it was NULL in every row of every table, the six filters matched everything, and
`deleteRoadById` issued a hard `DELETE` regardless. Unenforced, it was worse than
absent: it implied a protection that did not exist — `findUserByEmail` ignored it, so a
"soft-deleted" user could still sign in — and it would silently defeat every cascade
rule added in this step, since a soft delete never triggers one.

The columns are dropped. Nothing is lost, because they were provably always NULL. If
retention or audit is needed later, that wants an append-only audit table or an archive
schema designed against a real requirement, not a column that looks like one. The
reasoning is recorded at the top of `schema.prisma` so the next person does not
re-add it by reflex.

---

## D3 — cascade rules

| Relation | Was | Now |
| --- | --- | --- |
| `Road.userId` | nullable, `SetNull` | **required**, `Cascade` |
| `WayPoint.roadId` | nullable, `SetNull` | **required**, `Cascade` |
| `FavoriteRoad.roadId` | nullable, `SetNull` | **required**, `Cascade` |
| `FavoriteWaypoint.waypointId` | nullable, `SetNull` | **required**, `Cascade` |
| `FavoriteRoad.userId` | `Restrict` | `Cascade` |
| `FavoriteWaypoint.userId` | `Restrict` | `Cascade` |
| `ManuelAuth.userId`, `GoogleAuth.userId` | `Restrict` | `Cascade` |

`SetNull` on the owner columns produced rows nothing could reach: every listing filters
by owner and every authorization check *was* ownership, so an ownerless road could not
be listed, authorized, or cleaned up. It is also why `road.userId !== user.userId` was
fragile — it compared `null` against `undefined`.

`Restrict` on the other side was the opposite failure: a user with any favourite or
credential row could not be deleted at all.

The migration deletes the orphans that already exist. They cannot be re-parented,
because the information about who owned them is exactly what `SetNull` erased.

---

## D5 — one address per waypoint

`WayPoint.addressInfoId` is now `@unique`, making the relation 1:1 and owned. It was
many-to-one while the code created a fresh `AddressInfo` per waypoint *and*
`deleteRoadById` deleted addresses by id — so an address shared between two roads
would have been destroyed out from under one of them.

The migration resolves existing sharing by **cloning**, not by nulling, so no address
text is lost. The waypoint with the lowest id keeps the original row.

`deleteRoadById` now deletes the road in one statement and lets the cascade take the
waypoints, collecting the address ids first — the foreign key points from `WayPoint` to
`AddressInfo`, so cascading the waypoints away would otherwise leave their addresses
behind with nothing referencing them.

---

## D6 — case-insensitive email

`User.email`, `ManuelAuth.email` and `GoogleAuth.email` are `citext`. As plain text,
Postgres `@unique` is case-sensitive, so `Foo@x.com` and `foo@x.com` were two separate
accounts and `UserExistsGuard` could miss a case variant of an address that was already
taken.

Lookups are now case-insensitive at the database level, so `AuthService` normalises
nothing — the transform that lowercased on sign-up but only trimmed on sign-in (because
lowercasing a lookup would have locked out mixed-case accounts) is no longer needed.

**The migration refuses to run if two accounts differ only by case.** Merging or
deleting one of two real accounts is not a decision a migration should make silently,
so it aborts naming the offending addresses and leaves the database untouched:

```
ERROR:  Cannot convert email columns to citext: these addresses exist in more than
one letter case: foo@example.com. Merge or remove the duplicate accounts, then
re-run this migration.
```

---

## D7 — migration naming

68 migrations exist named `deneme`, `deneme2`, `update_favorites_2` … `_12`, and
`favorite_fix` seven times. They are left alone: rewriting applied history is riskier
than the confusion it removes, and squashing would break any database already at one of
those revisions. The new migration is named for its intent, and this document is the
record. Going forward: one migration per intent, named for the intent.

---

## D8 — seed

The seed carried `CREATE_PRODUCT`, `APPROVE_PRODUCT`, `UPDATE_PRODUCT` and a `SELLER`
permit — template leftovers unrelated to road planning. It also pinned three UUIDs, and
the ADMIN one was quotable straight from the repository, which is what made the
mass-assignment finding trivial to exploit: an attacker did not need to discover the
id, it was in version control.

Now: two permits (`ADMIN`, `USER`), two permissions, generated ids, and `upsert` so a
second run converges instead of throwing. `permissions: { set: … }` rather than
`connect`, so removing a permission from the list actually revokes it. CI runs the seed
**twice** to hold that property.

---

## H1 — Google OAuth

Three defects, all in the same flow.

**No `state` parameter.** `generateAuthUrl` omitted it and the callback checked none,
so an attacker could start a flow and have a victim's browser deliver the resulting
code — linking the attacker's Google identity to the victim's session. `state` is now a
nonce plus a timestamp under an HMAC, verified before the code is spent. Signing it
rather than storing it server-side keeps the callback stateless, which matters because
the redirect can land on a different instance than the one that issued the URL.

**`verified_email` was fetched and never checked.** `signInWithGoogle` matches an
existing user by email alone, so an unverified Google account bearing a victim's address
linked straight into that account. Now rejected, accepting either spelling
(`verified_email` / `email_verified`) and either type (boolean / `"true"`).

**Google's tokens were returned to the client** as though they were app sessions. The
client cannot authenticate against this API with them, and it put third-party
credentials in our database. `getAuthClientData` now returns only the verified email;
`signInWithGoogle` takes only an email and issues *this* API's token pair.

Also: an unconfigured server answers **503** instead of crashing on
`undefined.split(',')`, and `GOOGLE_OAUTH2_USERINFO_URL`, `GOOGLE_OAUTH2_ACCESS_TYPE`
and `GOOGLE_OAUTH2_PROMPT` are read from configuration — three of the variables `main`
introduced while this branch was in flight, now moved above the divider in
`.env.example` because code actually reads them.

---

## Tests

59 new tests; 474 unit + 74 e2e + **13 integration**.

### Two configuration bugs the new tests found

Both were introduced by this step's own additions and caught by tests written for them.

**`.env.example` could not be copied.** Optional entries are written `FOO=""`, which is
idiomatic for "not configured", but `@IsOptional()` only skips `undefined` and `null` —
so an empty string reached the validators and failed `@IsUrl` and `@IsIn`. Copying the
example file verbatim aborted the boot. Blank values are now treated as unset, but
**only** for variables that are optional *and* have no default: discarding a default
would be wrong generally and dangerous for the JWT lifetimes, where an unset expiry
mints tokens with no `exp` claim. There are tests for both halves of that asymmetry.

**A blank required string was accepted.** `@IsString()` passes on `''`, so
`MAIL_HOST=""` booted and failed later at send time — precisely the class of problem
boot validation exists to prevent. The required strings now carry `@IsNotEmpty()`.

### The migration was verified against real data, not just a clean database

A local Postgres 16 was seeded with exactly the conditions the migration has to
survive — ownerless roads, detached waypoints, dangling favourites, a shared
`AddressInfo`, and both digest and raw-JWT refresh tokens — and every outcome checked:

| Check | Result |
| --- | --- |
| Sessions carried forward | 1 (the digest row; raw JWT and NULL dropped) |
| Roads remaining | 1 (ownerless deleted) |
| Waypoints remaining | 3 (detached and on-orphan-road deleted) |
| Favourites remaining | 1 road, 1 waypoint (3 dangling deleted) |
| Distinct `addressInfoId` | 3 (shared address cloned, text preserved) |
| `deletedAt` columns | 0 |
| `Tokens` table | gone |

Then separately: the collision guard aborts naming the address and rolls the whole
transaction back; all 69 migrations apply to an empty database; `prisma migrate diff
--exit-code` reports no drift; and the seed runs twice.

### A real-database integration suite

`test/integration/schema.integration-spec.ts` (13 tests). Every other suite mocks
`PrismaService`, which is right for application logic but cannot test the schema: a
mock accepts a second session for the same user whether or not Postgres would, and has
no cascades, no `citext` and no unique indexes. These properties only exist in the
database, so they are asserted there:

```
multi-device sessions (D1)
  ✓ allows several concurrent sessions for one user
  ✓ rejects two sessions holding the same token digest
  ✓ revokes one session without touching the others
case-insensitive email (D6)
  ✓ treats addresses differing only by case as the same key
  ✓ finds a user by an address in a different case
cascade rules (D3)
  ✓ deletes a user's roads, waypoints and sessions with the user
  ✓ deletes favourites with the record they point at
  ✓ leaves a road with no owner impossible to create
one address per waypoint (D5)
  ✓ rejects two waypoints sharing an address
soft delete (D2)
  ✓ has no deletedAt column on any table
```

It skips when `INTEGRATION_DATABASE_URL` is unset, so `npm test` stays runnable with no
services. CI's database job sets it — and this suite immediately earned its place by
catching a stale test database whose schema no longer matched the migration.

---

## Verification

```
$ npm run format:check      # clean
$ npm run lint:check        # clean
$ npm run typecheck         # clean
$ npm test                  # 21 suites, 474 tests passed
$ npm run test:e2e          #  5 suites,  74 tests passed
$ npm run test:integration  #  1 suite,   13 tests passed (real Postgres 16)
$ npm run build             # clean
```

---

## Operational notes

**Read this before deploying.**

1. **The migration is destructive in two places, both deliberate:** orphaned rows are
   deleted (they were already unreachable), and outstanding password-reset links stop
   working. Take a backup.
2. **It aborts if two accounts differ only by email case.** Resolve those first; the
   error names them.
3. **`citext` must be installable.** The migration runs `CREATE EXTENSION IF NOT EXISTS
   citext`, which needs privileges the application role may not have. On managed
   Postgres it is usually available but may need enabling.
4. **Everyone with a pre-step-4 refresh token signs in again.** Access tokens keep
   working until they expire.

---

## Behaviour changes for clients

| Route | Change |
| --- | --- |
| `POST /auth/sign-in` | Signing in on a second device no longer signs the first out. |
| `POST /auth/sign-out` | Revokes **all** of the caller's sessions. Per-device sign-out is now possible in the data model, but not yet exposed — the client would need to identify which session it holds. |
| `GET /auth/google` | Response includes a `state` parameter in the redirect. |
| `GET /auth/google/callback` | Requires the matching `state` (401 without it). Returns this API's tokens under `data`, never Google's. Rejects unverified Google addresses. 503 when Google is not configured. |
| `PATCH /auth/reset-password/:token` | Links issued before this deploy no longer work. |
| all email fields | Case-insensitive. `Foo@x.com` and `foo@x.com` are one account. |

---

## Still open

Step 6, the last one: the response-envelope interceptor and global exception filter
(H9, Q5), the N+1 waypoint writes and missing `@@unique([roadId, order])` (D9),
pagination (D10), the `Dockerfile` copying `.env` into an image layer (H10), the empty
`updatePermitById` (Q6), and the mixed Turkish/English user-facing strings.
