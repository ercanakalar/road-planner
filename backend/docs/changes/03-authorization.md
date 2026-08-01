# Step 3 — Authorization

Closes **C3** (IDOR on waypoint routes), **C5** (unauthorized reads), **C7** (three
routes returning 403 unconditionally), **H8** (bare `Error` throws), **Q2**, **Q3**,
**Q4** (dead code), and the `deleteRoadById` item in **Q7**. Partially closes **H9**.

---

## C3 + C7 — one line, two defects

`RoadOwnerGuard` resolved the road it was protecting like this:

```ts
const roadId = req.params.id || req.query.id;
```

**Three routes were broken (C7).** `delete-waypoint/:waypointId`,
`update-waypoint/:waypointId` and `reorder-waypoint/:waypointId` have no `:id`
parameter. With no `?id=` query string either, `roadId` was `undefined` and the guard
threw `Forbidden('Missing user or road ID')` on **every** request. The shipped client
calls all three (`roadService.ts:194,214,243`), so deleting, editing and reordering
waypoints had never worked in production.

**The query fallback was an IDOR (C3).** A caller who supplied a road they owned
satisfied the guard, and the service then acted on a waypoint belonging to somebody
else:

```
DELETE /api/road/delete-waypoint/<victim-waypoint>?id=<attacker-road>   → 200
PUT    /api/road/update-waypoint/<victim-waypoint>?id=<attacker-road>   → 200
```

The guard checked one resource; the service mutated another.

### The rewrite

The road is now derived from the route parameter naming the record being acted on,
and from nothing else. The query string is never consulted.

| Route parameter | Resolution |
| --- | --- |
| `:waypointId` | Load the waypoint, follow its `roadId` |
| `:roadId` | The road id |
| `:id` | The road id |
| none of these | `ForbiddenException` — a misconfigured route fails closed |

Following the waypoint's own `roadId` is the point: it makes the authorized road and
the mutated record the same object by construction, so they cannot diverge again.

Also fixed in the same guard:

- A missing `req.user` raises `UnauthorizedException` instead of a `TypeError`
  (which surfaced as a 500).
- `Road.userId` is nullable, so an orphaned road has `userId === null`. The check is
  now explicit (`!road.userId || road.userId !== userId`) rather than relying on
  `null !== undefined`.
- A waypoint whose `roadId` is null is a 404 rather than an unauthorized read.

The `reorder-waypoint` route parameter is renamed `:waypointId` → `:roadId`, since a
road id is what the client actually sends there. The URL is unchanged.

---

## C5 — unauthorized reads

Three routes returned records with no ownership condition at all.

### `GET /api/road/:id` and `GET /api/road/waypoint/:id`

Owner-only would have been the obvious fix, and it would have broken a real feature.
`getAllFavorites` returns an `othersRoads` bucket, so favouriting another user's road
— reached through a share link — is supported behaviour.

A road is therefore visible when the caller **owns it or has favourited it**:

```ts
where: { id, OR: [{ userId }, { favoriteRoads: { some: { userId } } }] }
```

An existing favourite is treated as evidence the caller was granted access at some
earlier point. Waypoints follow the same rule through their road, plus a direct
favourite on the waypoint itself.

`getWaypointById` previously accepted `userId` and ignored it entirely — the argument
was there, unused, since the route was written.

An invisible road is **404, not 403**: distinguishing "exists but forbidden" from
"absent" is exactly what lets a caller enumerate ids.

> If roads are meant to be broadly readable, that belongs in the schema as an
> explicit `Road.isPublic` flag rather than as a missing `WHERE` clause. Noted for
> step 5.

### `GET /api/user/:id`

Returned the full `User` row — email, `nickName`, `permitId`, timestamps — for any id
to any authenticated caller. Now restricted to the caller's own id. The client only
ever requests the signed-in user's own id (`profileService.ts:26`), so this costs
nothing.

### `POST /api/favorites/toggle-road`

Did not check that the road existed; the raw id went to a foreign key. It now 404s
when creating a favourite for a nonexistent road, while still allowing an existing
favourite to be **removed** even if its road has since been deleted — otherwise a
deleted road would leave an un-removable favourite behind.

Making that check observable required a small change to the catch blocks in
`FavoritesService`: `HttpException`s are re-thrown rather than absorbed. They
previously caught everything — including their own `NotFoundException` — and answered
`200 OK` with `status: 'error'` in the body, so a client could not distinguish
success from failure by status code. This is a partial fix for H9; the full response
envelope and exception filter are step 6.

---

## Q2, Q3 — guards that misbehaved under their own contracts

**`PermissionsGuard`**

- Read metadata with `reflector.get(key, context.getHandler())`, which ignores
  class-level metadata — so `@RequirePermission` on a controller had no effect and the
  guard could only ever be used per handler. Now `getAllAndOverride` over
  `[handler, class]`.
- Dereferenced `request.user.userId` unguarded, so applying it to a `@Public()` route
  raised a `TypeError` → 500. Now a 401.
- Fell through to `permissions.some(p => p.name === undefined)` when no metadata was
  present. That is `false`, so the request was denied — the right outcome, reached by
  accident, and reported to the caller as though *they* lacked a permission. A guard
  applied without a declared permission is a wiring mistake, so it now says so with a
  500. It still never grants access.

**`AdminGuard`** was declared `extends AuthGuard('jwt-access')` while overriding
`canActivate` without calling `super.canActivate`. It performed no authentication of
its own and silently depended on the global guard having populated `req.user`, which
it then dereferenced unguarded. It is now a plain `CanActivate` — which is what it
always was — and checks for a principal before using one.

Both continue to read the permit from the database rather than the token, so a
demotion takes effect immediately rather than at token expiry. There is an e2e test
asserting that a token *claiming* `permit: { name: 'ADMIN' }` does not grant access.

The `isPublic` and `permission` metadata keys are now exported constants shared
between each decorator and its guard, instead of string literals repeated in four
places.

---

## Q4 — dead code removed

Each of these was verified unreachable: registered in no module, imported by nothing.

| Removed | Why it mattered |
| --- | --- |
| `GoogleGuard` | `canActivate` returned `true` unconditionally — it reads like protection and is none |
| `ResetGuard`, `ResetStrategy` | Never provided. `ResetStrategy` also took its token from a **query parameter**, which leaks it into access logs and `Referer` headers |
| `FileManagementService` (+ spec) | `join(cwd, '../uploads/' + name)` with no sanitisation — a path traversal waiting for whoever wired it up |
| `Roles` decorator | Superseded by `@RequirePermission` |
| `AppController`, `AppService` | Empty stubs; `AppController` was not in `AppModule`'s `controllers` |

Also removed: `@UseGuards(AccessGuard)` from the favorites controller and from
`sign-out`. `AccessGuard` is a global `APP_GUARD`, so those were no-ops — and worse
than redundant, because their presence implies the routes *without* them are
unauthenticated. An e2e test confirms favorites still require authentication.

`common/decorators/index.ts` now re-exports all three decorators; it previously
exported only `public.decorator`, which is why `GetUser` and `RequirePermission` were
imported by deep path in some files and through the barrel in others.

---

## Q7 — `deleteRoadById` reported success for work it did not do

```ts
const road = await tx.road.findFirst({ where: { id, userId } });
if (!road) return;              // …then: 'Road deleted successfully'
```

Now a `NotFoundException`. The check itself is kept as defence in depth behind
`RoadOwnerGuard`.

---

## Tests

42 new tests; 356 unit + 53 e2e total.

`test/authorization.e2e-spec.ts` is the important addition. Every defect in this step
was a **mismatch between a guard and the route it protected** — a guard unit test in
isolation cannot see that the route it guards declares a different parameter name, so
only a routed request catches it:

```
C7 — routes that used to return 403 unconditionally
  ✓ lets the owner delete a waypoint on their own road
  ✓ lets the owner update a waypoint on their own road
  ✓ lets the owner reorder waypoints on their own road

C3 — IDOR on the waypoint routes
  ✓ refuses to delete another user's waypoint even with ?id= set to an owned road
  ✓ refuses to update another user's waypoint even with ?id= set to an owned road
  ✓ refuses to delete another user's road even with ?id= set to an owned road

C5 — unauthorized reads
  ✓ does not return another user's road
  ✓ does not return another user's waypoint
  ✓ does not return another user's profile

admin routes
  ✓ reads the permit from the database, not the token
```

Unit coverage: 20 tests on `RoadOwnerGuard` (each parameter shape, the query-string
IDOR, orphaned roads and waypoints, fail-closed on an unrecognised route), plus new
cases on `PermissionsGuard`, `AdminGuard`, `RoadService` visibility, `UserService`
self-only reads, and `FavoritesService`.

---

## Verification

```
$ npm run format:check   # clean
$ npm run lint:check     # clean
$ npm run typecheck      # clean
$ npm test               # 22 suites, 356 tests passed
$ npm run test:e2e       #  3 suites,  53 tests passed
$ npm run build          # clean
```

---

## Behaviour changes for clients

| Route | Before | After |
| --- | --- | --- |
| `DELETE /road/delete-waypoint/:waypointId` | always 403 | works for the owner |
| `PUT /road/update-waypoint/:waypointId` | always 403 | works for the owner |
| `PUT /road/reorder-waypoint/:roadId` | always 403 | works for the owner |
| `GET /road/:id` | any road | own or favourited; 404 otherwise |
| `GET /road/waypoint/:id` | any waypoint | own or favourited; 404 otherwise. Now includes `address` |
| `GET /user/:id` | any user, full row | own profile only; 403 otherwise |
| `POST /favorites/toggle-road` | any id accepted | 404 for a nonexistent road (creation only) |
| `POST /favorites/toggle-waypoint` | 200 with an error body | 404 for a missing waypoint |
| `POST /road/delete/:id` | 200 "deleted" for a road it did not delete | 404 |

The three restored routes are strictly a fix. The read restrictions are the intended
tightening. The client requests only its own profile and its own or favourited roads,
so no screen should lose data.

---

## Still open

- **C1** — `forgotPassword` still returns the reset token in its response body.
- **C4 / C6** — refresh tokens are still not compared against storage, so sign-out
  revokes nothing, and the refresh route is still unreachable.
- **C8** — `signUp` still returns `userId: null`.

All four are step 4.
