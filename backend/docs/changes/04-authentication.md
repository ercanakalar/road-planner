# Step 4 — Authentication

Closes **C1** (reset token disclosed in the response), **C4** (sign-out revoked
nothing), **C6** (refresh route unreachable), **C8** (`signUp` returned a null id),
**H2** (no rate limiting), **H3** (timing-leaky, unversioned hashing), **H4** (account
enumeration), **H5** (`confirmPassword` unchecked, sessions survived a reset), **H8**
(remaining bare `Error` throws) and **Q1** (untyped, bloated token payload).

No schema migration. The `Tokens` columns are reused to hold *digests* rather than raw
tokens, which is the whole mechanism behind the revocation fix. The multi-session
`Session` table is step 5.

---

## C1 — the reset token was in the response body

```ts
return {
  status: ToastType.Success,
  header: 'Password Reset Token Created',
  message: 'Password reset token created successfully',
  resetToken,        // ← in the HTTP response
  resetTokenUrl,     // ← and the full reset link
};
```

`POST /api/auth/forgot-password` is unauthenticated. Anyone could name a victim's
address, read the token out of the response, and complete the reset. Email delivery
was decorative.

The hashing next to it made it worse by looking like a mitigation:

```ts
const rawToken = randomBytes(32).toString('hex');
const resetToken = createHash('sha256').update(rawToken).digest('hex');
return { resetToken, ... };   // rawToken discarded
```

The pre-image was thrown away, and the digest was both stored **and** emailed — so the
value in the database *was* the value that granted the reset. Meanwhile `hashToken` and
`verifyHashedToken`, sitting in the same file, implemented the correct pattern and were
called by nothing.

### Now

`createPasswordResetToken()` returns `{ token, tokenHash, expiresAt }`. The service
emails `token` and stores `tokenHash`; `resetPassword` hashes the incoming token and
looks up by digest. A database disclosure no longer yields usable reset links, and the
response carries only a generic acknowledgement.

`resetPassword` also became atomic. The old code read with an expiry filter and then
updated on `resetToken` alone, so two concurrent requests could both pass the read.
The write is now a compare-and-swap — `updateMany` filtered on the same digest — and a
`count` of zero means another request consumed it first.

And a reset now **revokes every live session** for the account (H5). A password reset
is the canonical response to a suspected compromise; leaving existing refresh tokens
valid defeated the point.

---

## C4 — sign-out revoked nothing

`signOut` set `Tokens.refreshToken` to `null`. `refreshToken()` verified the JWT
signature and never looked at the stored value. So a refresh token stayed usable until
its own expiry no matter how many times the user signed out, and there was no rotation
and no reuse detection.

### Now

- **Only the digest is stored.** `hashToken(refreshToken)` goes into the column. A
  database disclosure no longer hands over live sessions.
- **The presented token is compared against it** on every refresh, in constant time.
  Clearing the column therefore *is* revocation — the mechanism and the fix are the
  same change.
- **Every refresh rotates.** A captured token is usable at most once.
- **A mismatch drops the session.** A signature-valid token that does not match storage
  is either one already rotated away or one presented after sign-out; both are
  consistent with replay, so the stored digest is cleared rather than merely refused.
- **`Tokens.accessToken` is written as `null`.** Persisting it bought nothing —
  verification is by signature — and doubled the blast radius of a leak.

### A defect the tests found

The first version of rotation did not rotate. `iat` has one-second resolution, so two
refresh tokens signed for the same user within the same second were **byte-identical** —
the "new" token was the same string as the one it replaced, and the old one still
matched the stored digest. `createRefreshToken` now adds a random `jti`, which
guarantees every issued token is distinct. This is the half of Q1 that step 1 deferred.

---

## C6 — the refresh route could never succeed

`AccessGuard` is registered as an `APP_GUARD`, and controller-level `@UseGuards` is
**additive**, not a replacement. With `RefreshGuard` attached, `POST /auth/refresh-token`
required:

- a valid **access** token in `Authorization` to clear the global guard, and
- a valid **refresh** JWT in `Authorization` to clear `RefreshGuard`.

One header, two mutually exclusive requirements. Every request returned 401, for every
client, always.

### Now

`@Public()` exempts the route from the global guard, and the refresh token is read from
the **body** — where the shipped client already sends it — and verified in
`AuthService`. An `Authorization` header, if present, is ignored, so the client's
current request shape works unchanged.

`RefreshGuard` and `RefreshStrategy` are deleted along with the `RefreshRequest` type.
Nothing uses them, and leaving auth plumbing that looks live is the same problem as the
`GoogleGuard` removed in step 3.

---

## H3 — password hashing

Three problems, one file:

**The comparison was not constant time.** `buf.toString('hex') === hash` short-circuits
at the first differing character, so its runtime leaked how much of the hash matched.
Now `crypto.timingSafeEqual` over buffers, with the length-mismatch case handled
(`timingSafeEqual` throws on unequal lengths, which would itself be a signal).

**The cost was not recorded.** The format was `<hash>.<salt>` with scrypt at Node's
defaults, so raising the cost would have stopped every stored password from verifying.
Hashes are now written as:

```
scrypt$N=32768,r=8,p=1$<salt>$<hash>
```

The parameters travel with the hash, so `SCRYPT_PARAMS` can change freely. `N` is
doubled from Node's default to 32768. `needsRehash()` reports a stored hash written
under an older scheme or cost, and `signIn` upgrades it — the moment of a successful
sign-in is the only time the plaintext is available.

Legacy `<hash>.<salt>` values still verify, so no existing user is locked out. A stored
hash claiming absurd parameters is rejected rather than used, so a tampered row cannot
exhaust memory during verification.

**There was no length ceiling.** scrypt cost scales with input length, so an
arbitrarily long password was a CPU-exhaustion vector on unauthenticated routes.
Bounded at the DTO (128 chars) and again in the helper (1024 bytes) as a backstop for
non-HTTP callers.

---

## H4 — account enumeration

`signIn` answered `404 User not found` for an unknown address and `401 Invalid password`
for a wrong password. `forgotPassword` 404'd on unknown addresses.

Both now answer identically in every failure mode. `signIn` returns
`401 Invalid email or password` throughout, and `forgotPassword` returns the same
acknowledgement whether or not an account exists.

A uniform message alone is not enough: the two paths differed by an entire scrypt
derivation, so response latency disclosed what the message hid. `signIn` now compares
against a fixed dummy hash when no account exists, keeping the timing of the two paths
comparable.

---

## H2 — rate limiting

`sign-in`, `sign-up` and `forgot-password` were unthrottled. `@nestjs/throttler` is now
a dependency, `ThrottlerGuard` is registered as an `APP_GUARD` **before** `AccessGuard`
so a flood is rejected before it costs a JWT verification or a database round trip.

| Route | Limit |
| --- | --- |
| default (all routes) | 120 / min |
| `sign-in`, `sign-up`, `google/callback` | 10 / min |
| `refresh-token` | 20 / min |
| `reset-password` | 10 / min |
| `forgot-password` | 3 / min |

The global budget is deliberately generous. It is a backstop against a runaway client,
not the control protecting credentials, and the app polls its read endpoints on focus
and reconnect — a tight global limit would break ordinary use.

Limits are counted per client IP. **Behind a load balancer this needs `trust proxy` set
on Express**, or every request appears to come from the proxy.

`shouldSkipThrottle()` lets the e2e suites opt out, gated on `NODE_ENV === 'test'` as
well as the flag, so the escape hatch cannot be enabled in a deployed environment. Most
suites set it — otherwise every one of them would be silently coupled to the limits
above — while `test/throttle.e2e-spec.ts` clears it and asserts the limits directly.

---

## Google OAuth, partially

`googleCallback` used to return **Google's** access and refresh tokens to the client as
if they were app sessions. The client cannot authenticate against this API with them,
and it put third-party credentials in the app and in our `Tokens` table.

It now issues *this* API's token pair, stores only the digest of our refresh token, and
does not persist Google's tokens at all.

The remaining OAuth defects are **not** fixed here: there is still no `state` parameter
(CSRF on the callback) and `verified_email` is still unchecked, so an unverified Google
account bearing a victim's address still links to that account. Both are finding H1 and
need the schema work in step 5.

---

## Smaller items

- **C8** — `signUp` returned `existingUser ? existingUser.id : null`, so every ordinary
  registration answered `userId: null`. It now returns the id of the user the
  transaction created or updated.
- **Q1** — the access token no longer carries `permissions`. It embedded full Prisma
  `Permission` rows, ids and timestamps included, which nothing read: `PermissionsGuard`
  and `AdminGuard` both re-query the permit so a revocation takes effect immediately
  rather than at token expiry.
- **H8** — `AccessStrategy.validate` no longer re-checks the `Authorization` header and
  throws a bare `Error`. `ExtractJwt.fromAuthHeaderAsBearerToken()` has already
  guaranteed that shape by the time `validate` runs, so the check could not fail; its
  only possible effect was turning a correct 401 into a 500. It now validates that the
  payload has a subject and throws `UnauthorizedException`.

---

## Tests

101 new tests; 415 unit + 74 e2e total.

C1 and C6 are only observable end to end. C1 was about what appears in a **response
body**, and C6 was a guard-composition failure that no service-level test can see:

```
C1 — password reset token disclosure
  ✓ does not return the reset token in the response body
  ✓ returns nothing beyond a generic acknowledgement
  ✓ does not leak the token anywhere in the serialised response
  ✓ stores a digest that is not the emailed value
  ✓ answers identically for an address with no account

C6 — the refresh route is reachable
  ✓ does not require an access token
  ✓ rotates the refresh token rather than returning the same one
  ✓ still works when the client also sends an Authorization header

C4 — refresh tokens are checked against storage
  ✓ rejects a signature-valid token that does not match storage
  ✓ rejects a refresh after sign-out cleared the stored digest
```

Unit coverage adds: legacy-hash compatibility, the versioned format, absurd-parameter
rejection, the length ceiling, refresh reuse detection and session revocation, the
reset compare-and-swap, and that unknown-address and wrong-password answers are
byte-identical.

---

## Verification

```
$ npm run format:check   # clean
$ npm run lint:check     # clean
$ npm run typecheck      # clean
$ npm test               # 21 suites, 415 tests passed
$ npm run test:e2e       #  5 suites,  74 tests passed
$ npm run build          # clean
```

---

## Behaviour changes for clients

| Route | Change |
| --- | --- |
| `POST /auth/forgot-password` | **No longer returns `resetToken` / `resetTokenUrl`.** The only deliberate breaking change in this branch — returning them *was* the vulnerability. Always 200, even for unknown addresses. Limited to 3/min. |
| `POST /auth/refresh-token` | Now works. Returns a **new** refresh token each call; the client must store it and discard the old one. A token that does not match storage is 401 and drops the session. |
| `POST /auth/sign-in` | Uniform `401 Invalid email or password` (was 404 vs 401). Limited to 10/min. |
| `POST /auth/sign-out` | Now actually revokes; a subsequent refresh is 401. |
| `POST /auth/sign-up` | `data.userId` is populated (was `null`). |
| `PATCH /auth/reset-password/:token` | Invalidates all existing sessions, so the client must sign in again. |
| `GET /auth/google/callback` | Returns this API's tokens under `data`, not Google's. |
| all routes | 429 when a limit is exceeded. |

**The client needs one change**: `validateRefreshToken` must persist the
`data.refreshToken` from the response, because rotation invalidates the previous one.
It currently keeps sending the token it already has, which will now fail on the second
refresh. Worth pairing with the mobile update — noted rather than changed here, since
this branch is backend-only.

---

## Still open

Every 🔴 finding in [REVIEW.md](../REVIEW.md) is now closed. Remaining work:

- **Step 5** — schema: multi-device sessions, soft-delete consistency, cascade rules,
  case-insensitive email, the OAuth `state` parameter and `verified_email` check, seed
  cleanup.
- **Step 6** — response-envelope interceptor, global exception filter, the N+1 writes
  in the road service, pagination, the Dockerfile copying `.env` into an image layer,
  and the mixed-language user-facing strings.
