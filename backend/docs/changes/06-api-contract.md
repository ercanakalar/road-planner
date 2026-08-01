# Step 6a — the response contract

Closes **H9**, **Q5**, **Q6**, part of **Q7** (mixed-language strings, the raw shared
road), and adds a health endpoint. One theme: *every* response — success or failure —
now has one shape, decided in one place.

The remaining step-6 work (N+1 waypoint writes, waypoint order integrity, pagination,
the Dockerfile) is step 6b.

---

## Why this was more than tidying

The review filed Q5 as duplication: `{ status, header, message, data }` assembled by
hand in twenty-nine service methods. Reading the client settled that it is also a
functional bug.

`mobile-react-native/src/store/bases/transformApiResponse.ts` does exactly two things:

```ts
if (response?.message) {
  showNotification({ type: response.status, header: response.header ?? '', message: response.message });
}
return response.data as T;
```

So the envelope is not decoration. It is the contract:

- **A route that returns a bare value gives the client `undefined`.** `response.data`
  of a bare string is not the string. Three routes did this — `shareRoadByIdWithToken`
  returned a URL string, `getPermits` an array, `routeToSharedRoad` a road — which
  means **share links and the permit list never worked in the app at all**, and no
  backend test could see it, because the service returned a perfectly good value.
- **A route that carries a `message` fires a toast.** So adding one where none existed
  is a user-visible regression. `refresh-token` returns `{ data }` with no message on
  purpose: the app refreshes silently in the background whenever an access token
  expires, and a "signed in successfully" notification every fifteen minutes is not
  the intent.

Both constraints shaped the interceptor below.

---

## What changed

### 1. One envelope, built in one place

`src/common/http/api-response.ts`

```ts
export function ok<T>(parts: EnvelopeParts<T> & { data: T }): ApiEnvelope<T> & { data: T };
export function ok(parts?: EnvelopeParts<never>): ApiEnvelope<never>;
```

Twenty-nine `{ status: ToastType.Success, ... }` literals became `ok({ ... })`. The
output is byte-identical, so no client sees a difference — but the object is now
*typed*, and excess-property checking rejects a key that is not part of the envelope.

That immediately found a defect no test had. `signInWithGoogle` returned:

```ts
{ status, header, message, userId: existingUser.id, data: { userId, accessToken, refreshToken } }
```

A top-level `userId` beside `status` — a slot `transformApiResponse` never reads,
duplicating a value that was already in `data`. An inferred object literal accepted it
silently; `EnvelopeParts` does not. Removed, along with the assertion that had been
passing against it.

The overloads exist so that supplying `data` yields a type where `data` is present.
Without them every caller and every test would have to narrow an optional it had just
provided.

### 2. `ResponseEnvelopeInterceptor` — the guarantee

`src/common/interceptors/response-envelope.interceptor.ts`

```
already an envelope  →  passed through untouched
undefined / null     →  { status: 'success', data: null }
anything else        →  { status: 'success', data: <value> }
```

Handlers keep the header and message they chose; anything else is wrapped with **no
message**, so a route that was silent stays silent. `isEnvelope` keys on a `status`
holding one of exactly three `ToastType` strings — narrow enough that a domain object
with a `status` of `'draft'` is not mistaken for one.

`getDashboard` is the interesting case: it returns `{ message: 'Welcome…' }`, a domain
value that happens to have a `message` key. It gets wrapped as `data`, so the key does
not become a toast. There is an e2e test for exactly that.

`@Res()` handlers — the Google redirect — never reach the interceptor, because Nest
disables its own response handling for them.

### 3. `AllExceptionsFilter` — failures get a status code

`src/common/filters/all-exceptions.filter.ts`

There was no global filter, so anything that was not an `HttpException` reached Nest's
default handler: a bare 500 whose body carried the raw exception message. A Prisma
failure therefore answered a *malformed request* with a 500 that quoted the failing
query and the column names in it.

| Thrown | Answer |
| --- | --- |
| `HttpException` | its own status; Nest's body preserved, envelope fields added |
| Prisma `P2002` | 409 — "That value is already taken." |
| Prisma `P2025` | 404 |
| Prisma `P2000` / `P2003` / `P2011` / `P2014` | 400 |
| Prisma unmapped code, `PrismaClientValidationError` | 500, generic message |
| `PrismaClientInitializationError`, `RustPanicError` | 503 |
| anything else | 500, generic message |

Three deliberate choices:

- **`HttpException` bodies are spread, not rebuilt.** `ValidationPipe` puts an
  *array* of failing constraints in `message` and the client renders it field by
  field. Rebuilding the body would flatten it.
- **Prisma messages are generic; `error.meta` never travels.** For a unique-constraint
  violation `meta.target` names the exact index, which describes the schema rather
  than the request. The detail is logged instead — tested both ways, because a generic
  500 with nothing in the log is undiagnosable.
- **5xx logs a stack, 429 logs a line, other 4xx logs at debug.** An expired access
  token is routine; logging it at warn would bury the 500s. The request body is never
  logged — sign-in, sign-up and password-reset bodies all carry credentials.

### 4. `FavoritesService` no longer answers 200 for failures (H9)

Both toggles ended in:

```ts
return { status: ToastType.Error, header: 'Error', message: 'An error occurred while …' };
```

reached by a catch that absorbed `NotFoundException`, foreign-key violations and
unknown infrastructure errors alike. A dropped connection looked like a handled
outcome, and monitoring saw a successful request.

Only a duplicate (`P2002`) is caught now, and only because it is the benign race: two
concurrent taps both read "not favourited", so the loser hits
`@@unique([userId, waypointId])` — its intent is already satisfied, so that is a
success. Everything else propagates.

Both toggles also now look the existing favourite up through the compound unique key
inside a transaction, rather than `findFirst` outside one. The road variant gained the
"still removable after its road is deleted" behaviour the waypoint variant had, and
vice versa.

### 5. `updatePermitById` does something (Q6)

It was `async updatePermitById(updatePermit: UpdatePermitDto) {}` — an empty body
behind a live admin route, so `POST /api/permissions/permit/update-id` answered 200 and
changed nothing. Silence is the worst possible answer for an authorization change: an
administrator revoking a permission was told it worked.

`UpdatePermitDto` was also field-for-field identical to `AssignPermitDto`
(`{ userId, permitId }`). Two routes taking the same body, one of them a no-op, is not
an API. So:

| Before | After |
| --- | --- |
| `POST permit/update-id`, body `{ userId, permitId }`, no-op | `PUT permit/:permitId`, body `{ description?, permissionIds? }` |

- `permissions: { set: [...] }`, so **removing** a permission is expressible. A grant
  set built from `connect` alone can only ever grow.
- `permissionIds` are verified to exist first, in the same transaction, because `set`
  silently ignores ids that do not resolve — a mistyped id would otherwise report
  success for a permit that gained nothing.
- `name` is deliberately **not** updatable. Permit names are the identifiers
  `AdminGuard` and the seed match on, so renaming one silently revokes admin.
  Declaring no `name` property means `whitelist` strips it.
- An empty body is a 400 rather than a silent success.

Nothing can depend on the old route: no client in this repository calls it, and it
never wrote to the database.

### 6. `UserExistsGuard` — a 500 on empty sign-up

Guards run **before** pipes, so this guard was the first thing to touch the request
body — before `SignUpDto` had a chance to reject it. It passed `body.email` straight to
`findUnique`, and Prisma throws on a non-scalar unique selector. So:

```
POST /api/auth/sign-up  {}                        → 500   (should be 400)
POST /api/auth/sign-up  {"email": {"contains":"@"}} → 500   (should be 400)
```

Anything that is not a non-blank string is now handed on untouched, so
`ValidationPipe` produces the 400 that names the actual problem. Six e2e cases cover
it.

The Turkish `'Bu kullanıcı zaten kayıtlı.'` is now
`'An account with this email already exists'`.

**Not** changed, and documented in the guard: this route confirms account existence,
which is enumeration. A registration form has to tell the user their email is taken,
and the alternative — accepting the sign-up and emailing the existing owner — is a
larger change than this branch is making. The exposure is bounded by the 10/minute
limit. Sign-*in* gives nothing away.

### 7. `routeToSharedRoad`

Beyond the envelope: `userId` is projected out with `omit`, and a token for a road that
has since been deleted is a 404 rather than a `null` payload the client cannot
distinguish from a decode failure. A share link says "look at this road", not "here is
who owns it", and the owner's id is a handle for other routes.

Still a `POST` for a read, and the token has no revocation path. Both are noted in
REVIEW.md and left: changing the verb breaks the shipped client, and revocation needs a
table.

### 8. `GET /api/health`

`@Public()` because a probe has no credentials, `@SkipThrottle()` because an
orchestrator polls every few seconds — under the global 120/minute budget a busy load
balancer would rate-limit itself into reporting the service unhealthy.

The database check is a real `SELECT 1`, not a look at Prisma's connection flag:
`$connect()` succeeding at boot says nothing about whether the connection is still
usable, and a probe that cannot tell the difference will never let an orchestrator
replace a pod that lost its database. A failed dependency answers **503**, not 200 with
`status: 'down'` — probes read the status code.

---

## Tests

| File | Covers |
| --- | --- |
| `src/common/http/api-response.spec.ts` | `ok()` omission rules, `isEnvelope` boundaries |
| `src/common/interceptors/response-envelope.interceptor.spec.ts` | pass-through vs wrap, never inventing a message |
| `src/common/filters/all-exceptions.filter.spec.ts` | every status mapping, no schema detail in the body, log levels |
| `src/permissions/permissions.service.spec.ts` | `set` semantics, unknown-id rejection, no-op rejection, name never written |
| `src/health/health.service.spec.ts` | up / down, 503 on down, real query issued |
| `src/favorites/favorites.service.spec.ts` | duplicates succeed, everything else propagates |
| `src/common/guards/user-exists/user-exists.guard.spec.ts` | six shapes of unvalidated `email` passed through unqueried |
| `test/responses.e2e-spec.ts` | the whole contract over real HTTP: 24 cases |

Two things are only observable end to end, which is why the e2e suite exists. The
interceptor's job is to guarantee a `data` field, and the three routes it fixes were
broken precisely *because* nobody looked at the wire — the service returned a value,
the client read `response.data`, and the mismatch lived in between. The filter's job is
to turn a thrown exception into a status code, which needs an exception actually
escaping a handler.

`createPrismaMock` gained `$queryRaw` (for the health check) and now distinguishes an
absent `body` from `{}`, because Express leaves `req.body` undefined when no parser
matched the content type and a guard reading it before the pipes have run must survive
that.

```
$ npm run format:check   # clean
$ npm run lint:check     # clean
$ npm run typecheck      # clean
$ npm test               # 26 suites, 574 tests passed
$ npm run test:e2e       #  6 suites,  97 tests passed
$ npm run test:integration  # 1 suite, 13 tests passed (real Postgres 16)
$ npm run build          # clean
```

---

## Behaviour changes for clients

| Route | Change |
| --- | --- |
| `GET /road/share/:id` | Now `{ data: { url } }`. **Was a bare string, so the client got `undefined`** — the feature did not work. |
| `POST /road/share/:token` | Now `{ data: <road> }`, without `userId`. **Was a bare road.** 404 for a deleted road. |
| `GET /permissions/permit/get-all` | Now `{ data: [...] }`. **Was a bare array.** |
| `GET /permissions/permit/get-id/:id` | 404 for an unknown id (was 200 with `null`). |
| `POST /permissions/permit/update-id` | **Removed.** Replaced by `PUT /permissions/permit/:permitId` with `{ description?, permissionIds? }`. The old route was a no-op. |
| `POST /auth/refresh-token` | Now carries `status: 'success'`; still no `message`, deliberately. |
| `POST /auth/sign-up` | Malformed or absent `email` is 400 (was **500**). Taken email reads in English. |
| `POST /favorites/toggle-*` | Failures carry a real status code: 404 for a missing target, 500 for an infrastructure fault. **Both were 200** with an error body. |
| `GET /auth/google/callback` | No longer duplicates `userId` at the top level; it is in `data`, where it already was. |
| all routes | Every success has `data`. Every failure has `status: 'error'`, `statusCode`, `path`, `timestamp`, and a message that does not describe the schema. |
| `GET /health` | New. |

No client change is *required* by this step: every field that existed still exists in
the same place. The three bare-value routes gained a payload where the client was
already looking, so they start working without a client edit.

---

## Deliberately left

- **The envelope is still built in the service layer**, not derived from route
  metadata. Moving `header`/`message` onto a decorator would separate presentation
  from data more cleanly, but it trades twenty-nine literals for twenty-nine
  decorators and churns every service test. `ok()` gets the type safety and the single
  definition, which was the actual complaint.
- **`forbidNonWhitelisted` stays off** — `DraggableList.tsx` spreads whole server
  entities into update payloads.
- **`POST /road/share/:token`** keeps its verb, and share tokens keep having no
  revocation path.
- **Sign-up still confirms whether an email is registered** (see §6).
