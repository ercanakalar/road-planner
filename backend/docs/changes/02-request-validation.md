# Step 2 — Validated DTOs on every route

Closes **C2** (privilege escalation via mass assignment) and the bounds-check half
of **Q7**. Partially closes **H5** (`confirmPassword` is now compared; session
invalidation after a reset is step 4).

---

## The vulnerability

`POST /api/user/update` allowed any authenticated user to become an administrator.

Three things lined up:

1. `UpdateUser` was a bare TypeScript `type`. Types are erased at compile time, so
   the global `ValidationPipe` received no metadata and validated nothing.
2. The pipe was constructed as `new ValidationPipe()` — no `whitelist`, so nothing
   was stripped either.
3. `UserService.updateUser` did `data: { ...body }` straight into
   `prisma.user.update`.

Every column on `User` was therefore writable from the request body:

```http
POST /api/user/update
Authorization: Bearer <any valid access token>

{ "permitId": "909c9b35-eec3-4afe-a21d-986682659f5a" }
```

That UUID is the `ADMIN` permit, hardcoded in `prisma/seed.ts:20`. `email`,
`deletedAt` and `createdAt` were writable the same way.

## The fix

Two independent layers, because either alone can be undone by a later edit:

**Layer 1 — the pipe strips.** `whitelist: true` drops any property with no
matching decorator on the DTO. `UpdateUserDto` declares exactly four properties —
`firstName`, `lastName`, `photo`, `nickName` — so `permitId` never reaches the
service.

**Layer 2 — the service maps explicitly.**

```ts
const data: Prisma.UserUpdateInput = {};
if (body.firstName !== undefined) data.firstName = body.firstName;
if (body.lastName  !== undefined) data.lastName  = body.lastName;
if (body.photo     !== undefined) data.photo     = body.photo;
if (body.nickName  !== undefined) data.nickName  = body.nickName;
```

Adding a field to the DTO later cannot silently make it writable, and reviewing
what this route can change means reading four lines.

`getUserById` and `updateUser` also project explicitly now instead of returning the
whole row — `permitId` and `deletedAt` are no longer disclosed. Restricting *which*
users a caller may read at all is C5, in step 3.

---

## DTOs added

| File | DTOs |
| --- | --- |
| `auth/dto/auth.dto.ts` | `SignUpDto`, `SignInDto`, `ForgotPasswordDto`, `ResetPasswordDto`, `RefreshTokenDto` |
| `user/dto/update-user.dto.ts` | `UpdateUserDto` |
| `road/dto/road.dto.ts` | `CreateRoadDto`, `UpdateRoadDto`, `WaypointInputDto`, `AddressInputDto`, `AddWaypointDto`, `UpdateWaypointDto`, `ReorderWaypointsDto` |
| `favorites/dto/favorites.dto.ts` | `ToggleFavoriteWaypointDto`, `ToggleFavoriteRoadDto` |
| `permissions/dto/permissions.dto.ts` | `AssignPermitDto`, `UpdatePermitDto` |

Shared bounds live in `common/dto/constants.ts` and reusable transforms in
`common/dto/transforms.ts`. The superseded `*/type/*.type.ts` request files are
deleted; `auth/type/auth.types.ts` keeps only the non-request types (`JwtPayload`,
token claims, `GoogleAuthClient`).

`ParseUUIDPipe` now guards every id route parameter, so a malformed id is a 400
before it reaches Prisma. `:token` parameters are exempt — reset and share tokens
are not UUIDs.

### Choices worth flagging

**Password length is bounded at 128** (`PASSWORD_MAX_LENGTH`). Not cosmetic: scrypt
cost scales with input length, so an unbounded password is a CPU-exhaustion vector
against three unauthenticated routes.

**`SignInDto` has no minimum length and no strength pattern**, deliberately.
Accounts created before the policy existed must still be able to sign in, and
rejecting a weak password at sign-in would disclose the policy without ever
consulting the account. Only the ceiling applies.

**Emails are lowercased on sign-up but only trimmed on sign-in.** `User.email` is
case-sensitively unique in Postgres, so existing rows may hold mixed case;
lowercasing a sign-in address would lock those accounts out. Normalising the stored
data is D6, in step 5 with its migration — after which the lookup can normalise too.

**`WaypointInputDto.type` is optional**, though the old `CreateWaypoint` declared it
required. The requirement was never enforced (nothing validated anything), the
service never reads it, and the client builds this array from waypoints it read back
from the API, which carry no `type`.

**Waypoint arrays are capped at 500.** Each entry is a separate insert inside one
transaction, so an unbounded array holds a write transaction open indefinitely.

---

## Two compatibility decisions

Both come from reading what the shipped React Native client actually sends. Getting
these wrong would have broken the app rather than secured it.

### `forbidNonWhitelisted` stays off

Rejecting unknown properties outright is the stricter setting, and step 1 enabled
it. It had to come back off.

`mobile-react-native/src/components/DraggableList.tsx:49-61` builds its update
payload by spreading whole entities read back from the API:

```ts
const newOrder = newData.map((item, index) => ({ ...item, order: index + 1 }));
updateRoadById({ accessToken, routeId, title, description, waypoints: newOrder });
```

Each `item` carries `id`, `roadId`, `addressInfoId`, `createdAt`, `updatedAt`,
`deletedAt`, `favoriteWaypoints`, `isFavorite`, and a nested `address` with its own
`id` and timestamps. `profileService.ts:42` similarly sends `id` and `email` to
`/user/update`.

With `forbidNonWhitelisted: true` every one of those requests becomes a 400 — the
app's main write path. **Stripping is equally safe for the vulnerability**: the
fields never reach Prisma either way. The difference is only whether the client
learns it sent something extra. Enable it once the client sends minimal payloads;
the option is commented in `config/bootstrap.ts` with this reasoning.

### `enableImplicitConversion` is off

Step 1 enabled this. Writing the tests showed what it does: class-transformer
coerces by the reflected TypeScript type, so `{"firstName": 42}` becomes the string
`"42"` and `{"firstName": {}}` becomes `"[object Object]"` — both passing
`@IsString()`. Three tests that should have failed passed.

Turned off. Route parameters that genuinely need coercion use an explicit pipe.

---

## Other fixes in scope

- **`reorderWaypoints` bounds-checks its indices** (Q7). An out-of-range `from` made
  `waypoints[from]` `undefined`, which was spliced into the array and then
  dereferenced as `wp.id` — a 500 on input that should be a 400. Now a
  `BadRequestException` naming the valid range, and `from === to` short-circuits.
- **`reorderWaypoints` takes its `roadId` from the path, not the body.**
  `RoadOwnerGuard` authorizes the path parameter, so acting on a body-supplied id
  meant authorizing one road and mutating another. A body `roadId` that disagrees
  with the path is now rejected rather than trusted. The route parameter is renamed
  `:waypointId` → `:roadId` to match what the client actually sends; the URL is
  unchanged.
- **`resetPassword` compares `confirmPassword`** (H5, partial). The field was
  declared on the old type and compared nowhere, so a mistyped confirmation silently
  set a password the user did not intend.
- **`signOut` throws `UnauthorizedException`** instead of a bare `Error`, which Nest
  reported as a 500 (H8).
- **`user.findUnique` → `findFirst` for the nickname uniqueness check.** The old
  code passed `nickName` together with a `NOT` clause to `findUnique`, which is not
  a unique selector.
- **An update with no usable fields returns 400** rather than issuing an empty
  `UPDATE`.

---

## Tests

167 new tests, 314 total.

`src/testing/validate-dto.ts` runs payloads through a `ValidationPipe` configured
exactly as `configureApp` configures it. That matters: `whitelist` is a pipe option,
not a decorator, so calling `validate()` directly would not exercise the stripping —
the very behaviour that closes C2.

| Spec | Tests | Covers |
| --- | --- | --- |
| `user/dto/update-user.dto.spec.ts` | 33 | Every escalation field is stripped; the client's real payload is accepted |
| `auth/dto/auth.dto.spec.ts` | 33 | Password policy, email normalisation, sign-in leniency |
| `road/dto/road.dto.spec.ts` | 53 | Coordinate bounds, nested address validation, array caps, echoed server fields |
| `road/services/road/road.service.spec.ts` | 24 | Reorder bounds, path-vs-body `roadId` |
| `user/user.service.spec.ts` | 13 | Explicit mapping, projection, nickname uniqueness |
| `favorites` + `permissions` dto specs | 21 | UUID validation, stripping |
| `test/validation.e2e-spec.ts` | 16 | The escalation, end to end through the real HTTP stack |

The e2e suite is where C2 is actually proven closed, because the vulnerability was a
composition failure rather than a bug in any one file:

```
✓ does not write permitId, so a user cannot promote itself to ADMIN
✓ does not write email
✓ ignores a client-supplied id and updates the token subject
✓ accepts the payload the shipped client sends
```

---

## Verification

```
$ npm run format:check   # clean
$ npm run lint:check     # clean
$ npm run typecheck      # clean
$ npm test               # 22 suites, 314 tests passed
$ npm run test:e2e       #  2 suites,  35 tests passed
$ npm run build          # clean
```

---

## Behaviour changes for clients

| Route | Change |
| --- | --- |
| `POST /auth/sign-up` | Passwords must be 8–128 chars with a letter and a digit; malformed emails rejected. Emails are lowercased. |
| `PATCH /auth/reset-password/:token` | `confirmPassword` is required and must match. Same password policy. |
| `POST /auth/refresh-token` | `refreshToken` must be JWT-shaped. |
| `POST /user/update` | Only the four profile fields are applied; others are ignored. An empty effective update is a 400. Nicknames are 3–30 chars, `[A-Za-z0-9._-]`. |
| all `:id` parameters | Must be a UUID (400 otherwise). |
| road/waypoint bodies | Coordinates must be in range; ≤ 500 waypoints per road. |
| `PUT /road/reorder-waypoint/:roadId` | Out-of-range indices are a 400 rather than a 500. A body `roadId` disagreeing with the path is a 400. |

No response shape changed, and no field the client sends is rejected.

---

## Still open

- **C3 / C5 / C7** — the authorization defects. `RoadOwnerGuard` still reads
  `req.params.id`, so the three waypoint routes still 403 and the IDOR is still
  reachable. `getWaypointById` still carries its `FIXME(C5)`. → step 3
- **C1** — `forgotPassword` still returns the reset token in its response. → step 4
- **C4 / C6** — refresh tokens are still unvalidated against storage, and the
  refresh route is still unreachable. → step 4
