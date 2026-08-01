# Step 6b — write paths, ordering integrity, pagination, packaging

Closes **D9**, **D10** and **H10** — the last open findings in
[REVIEW.md](../REVIEW.md).

---

## 1. Waypoint ordering is now a constraint, not a convention (D9)

`WayPoint.order` had no uniqueness constraint, so two waypoints on one road could
share a position and positions could skip values. Every write path renumbered the
whole road afterwards to paper over it — one `UPDATE` per waypoint, through
`Promise.all` inside a transaction.

### The constraint has to be deferred, and that was checked before relying on it

The obvious `@@unique([roadId, order])` breaks reordering. A permutation transiently
assigns a value another row still holds, and a per-row unique index checks each row as
it is written:

```sql
CREATE UNIQUE INDEX wp_road_ord ON wp(road, ord);
INSERT INTO wp VALUES ('a','r1',1),('b','r1',2),('c','r1',3);
UPDATE wp SET ord = v.ord FROM (VALUES ('a',3),('b',1),('c',2)) AS v(id,ord) WHERE wp.id = v.id;
-- ERROR:  duplicate key value violates unique constraint "wp_road_ord"
```

The end state is perfectly unique; the index rejects it anyway. With
`DEFERRABLE INITIALLY DEFERRED` the check happens once at commit:

```sql
ALTER TABLE wp ADD CONSTRAINT wp_road_ord UNIQUE (road, ord) DEFERRABLE INITIALLY DEFERRED;
-- same UPDATE -> UPDATE 3, giving a=3 b=1 c=2
INSERT INTO wp VALUES ('d','r1',1);
-- ERROR:  duplicate key value violates unique constraint  ← still catches real duplicates
```

`schema.prisma` has no syntax for deferrability, so the open question was whether
Prisma would see a raw-SQL deferrable constraint as drift and try to "fix" it on the
next migration. It does not:

```
$ npx prisma migrate diff --from-url <migrated db> --to-schema-datamodel ./prisma/schema.prisma --exit-code
No difference detected.
```

That is why the constraint exists rather than being worked around. Because Prisma
cannot express the property, the integration suite reads it back from `pg_constraint`
— a future migration recreating the constraint without `DEFERRABLE` would break every
reorder in the application, and that assertion is the only thing that would say so.

### The migration normalises before it constrains

Duplicate and gapped positions were representable, so real data may hold them. The
migration renumbers each road to 1..N first, ordered by the current `order` with
`createdAt` then `id` as tiebreakers — a total order matters precisely because a tie
is what this exists to eliminate; without one the result would depend on the query
plan.

Verified against a database seeded with exactly that:

| Before | After |
| --- | --- |
| `r1`: w1@1, w2@1 (duplicate), w3@5 (gap) | `r1`: w1@1, w2@2, w3@3 |
| `r2`: x1@1, x2@2 (already fine) | `r2`: unchanged |

It also drops `@@index([roadId, order])`, which the unique index supersedes.

### Positions are assigned, not accepted

`positionByRank` treats a client's `order` values as a *ranking* and stores contiguous
1-based positions. Necessary, not cosmetic: `createRoad` used to store the supplied
values verbatim, so a payload with two waypoints at `order: 1` — which the old code
silently repaired by renumbering afterwards — would now be a 409. Ranking them keeps
that payload working. A payload with no meaningful `order` (the shipped client spreads
whole entities and sends them in display order) comes out in arrival order.

---

## 2. Five write paths, no longer N+1 (D9)

`src/road/services/road/waypoint-writes.ts` holds the bulk primitives. Prisma has no
bulk-update-by-id form — `updateMany` applies one identical `data` to every matched
row, which is the opposite of renumbering — so these are raw statements, with values
interpolated through `Prisma.sql` and therefore parameterised.

| Path | Was | Now |
| --- | --- | --- |
| `createRoad` | 2 statements **per waypoint** (`wayPoint.create` + nested `address.create`) | 3 |
| `updateRoadById` | 1–2 per waypoint, plus a delete | ≤ 8 |
| `addWaypointToRoad` | read the whole road back, then 1 `UPDATE` per existing waypoint | 5 |
| `deleteWaypointById` | read every survivor, then 1 `UPDATE` each | 3 |
| `reorderWaypoints` | 1 `UPDATE` per waypoint via `Promise.all` | 2 |

A fifty-waypoint road cost a hundred round trips to create and fifty to reorder. It
now costs three and two.

The `Promise.all` was not even buying concurrency: statements in one transaction
serialise on a single connection regardless. What it did buy was a wider window in
which two overlapping transactions touch the same rows in different orders, which is
how deadlocks happen.

Three details worth naming:

- **`addWaypointToRoad` shifts, it does not renumber.** Everything at or after the
  insertion point moves down by one, freeing exactly that position; shifted positions
  stay above every unshifted one, so relative order survives. Then
  `compactWaypointOrder` closes the gap an insertion past the end leaves (`order: 50`
  on a three-waypoint road). The shift is another statement that only works deferred.
  An earlier attempt used a negative offset to "avoid collisions" — which inverted the
  shifted block relative to the rest, because negatives sort first. `order + 1` is both
  sufficient and order-preserving.
- **`updateRoadById` updates in place rather than replacing.** Delete-and-reinsert
  would be simpler and equally free of N+1, but waypoint ids are referenced by
  `FavoriteWaypoint` — recreating them would cascade a user's favourites away on every
  road edit. There is an integration test for exactly that.
- **An address edit sent by the shipped client was being discarded.** Found while
  re-reading the rewrite against `DraggableList.tsx`, which builds its payload as
  `{...waypoint}` — so every entry carries the waypoint's own `addressInfoId` next to
  its `address`. The old code let `addressInfoId` win unconditionally and dropped the
  inline values, so an edit arriving that way named the address it was trying to edit
  and was silently ignored. An `addressInfoId` naming a *different* address still wins
  (that is a request to reuse one); naming the address the waypoint already owns no
  longer does, because re-linking it is a no-op and there is nothing to lose by
  writing the values instead. Pre-existing behaviour, not a regression from the bulk
  rewrite.
- **`compactWaypointOrder` renumbers in SQL** rather than reading the ids back first,
  which removes the read-then-write window where a concurrent insert would be
  renumbered on stale information.

### A bug the integration suite found

A *deferred* violation is raised by the commit, not by the statement — and Prisma only
recognises it as `P2002` when that commit happens inside `$transaction`. Outside one it
arrives as `P2010` ("raw query failed") with the SQLSTATE in `meta.code`:

```
P2010  meta { code: '23505', message: 'Key ("roadId", "order")=(…, 2) already exists.' }
```

`AllExceptionsFilter` mapped that to a **500**. It now reads `meta.code` and maps
23505/23503/23502/23514 to 409/400/400/400, with a generic message — `meta.message`
quotes the offending key values, so it is logged rather than sent. Every production
caller runs inside `$transaction` and so sees `P2002`, but a raw statement failing on a
constraint should never have been a server error.

---

## 3. Collection endpoints are bounded (D10)

`getOwnRoads`, `getPermits` and `getAllFavorites` returned unbounded result sets with
deep `include` trees. `PaginationQueryDto` adds optional `limit` (default 50, ceiling
200) and `offset` (default 0), so an existing client — which sends neither — keeps
working while the reads stop being unbounded.

Page information goes in `meta`, **beside** `data` rather than inside it: the client
reads its payload from `data`, so nesting it there would change the shape every list
screen consumes. At the top level it is a field the current client ignores.

Two things that matter more than the parameters:

- **Every paged query is ordered.** Offset paging over an unordered query returns
  arbitrary pages — Postgres may return rows in any order, so page 2 can repeat a row
  from page 1 and omit another entirely. `id` breaks ties on `createdAt`, which is not
  unique. An integration test asserts two pages are disjoint and together cover the
  collection.
- **Nothing can yield a nullish limit.** The first version returned `undefined` for a
  blank value and leaned on `@IsOptional()`. That discarded the property default, so
  `take` reached Prisma as `undefined` — meaning *no limit*. `?limit=` switched
  pagination off entirely. Caught by a test written for it; the transform now falls
  back to the default for absent, `null` and blank alike, and `@IsOptional()` is gone.

`getAllFavorites` also went from four queries to two plus two counts. The own and
others' variants differed only by an own-vs-others predicate on the same table, so
each pair is one query partitioned in code. One additive shape change made that
possible: a favourited road now always carries its waypoints, where they used to
appear only in the `othersRoads` bucket — the same entity had two shapes depending on
who owned it.

---

## 4. Packaging (H10)

The old `Dockerfile` was a single stage that ran `COPY .env ./`, `npm install`, and
`npm run start:dev` **as root**.

`COPY .env` is the serious one. Deleting the file in a later stage would not help:
every layer is recoverable from the image, so a secret committed to one is disclosed
to anyone who can pull it.

| | Before | After |
| --- | --- | --- |
| Secrets | `COPY .env ./` into a layer | never copied; `.dockerignore` keeps `.env` out of the build context entirely |
| Install | `npm install` | `npm ci`, which fails when the tree and lockfile disagree |
| User | root | `node` (uid 1000) in both targets |
| Stages | one | `deps` → `builder` → `production`, plus a `development` target for compose |
| Contents | source, devDependencies, full toolchain | `dist/`, production dependencies, Prisma client, `prisma/` for `migrate deploy` |
| Base | `node:slim`, which floats across majors | pinned to `22-slim` |
| Entrypoint | `npm run start:dev` | `["node", "dist/main"]` — exec form, so the process is PID 1 and gets SIGTERM directly. Under `npm` the signal reaches npm, `enableShutdownHooks` never runs, and Prisma's pool is killed rather than closed. |
| Health | none | `HEALTHCHECK` against `/api/health` |

`docker-compose.yml`:

- The hardcoded database password is now `${POSTGRES_PASSWORD:-road-map}` — still works
  out of the box, overridable for anything that is not a laptop.
- Backend secrets come from `backend/.env` via `env_file` with `required: false`, not
  from this file, which is in version control. `required: false` matters: without it
  Compose aborts with `env file … not found`, where the application's own validation
  would have named every missing variable at once.
- `postgres:latest` → `postgres:16`. `citext`, deferrable constraints and
  `gen_random_uuid()` all matter here, and `latest` silently becomes a new major.
- `build.target: development`, without which Docker builds the *last* stage — now
  `production` — which has no watcher and would ignore the bind mount.
- A `healthcheck` on the database plus `condition: service_healthy`, because the app
  opens its pool at boot and so fails rather than waits.
- Dropped `DATABASE_HOST` / `PORT` / `NAME` / `USER` / `PASSWORD`: nothing reads them,
  which is the same problem the `CREATE_TABLES` entry had.

**The image was not built.** This environment's network policy denies
`production.cloudfront.docker.com`, so `docker build` cannot pull `node:22-slim`:

```
ERROR: failed to resolve source metadata for docker.io/library/node:22-slim: … Forbidden
```

What *was* verified: `docker compose config` resolves the whole stack; the healthcheck
one-liner is valid JS and exits 1 with nothing listening and 0 against a live server;
and the artefact the production stage ships — `dist/main` — boots against real
Postgres and answers the health probe:

```
$ node dist/main   # NODE_ENV=production, real database
{"status":"success","data":{"status":"up","uptime":1,"database":"up"}}
```

The Dockerfile's own build steps have not been executed and should be on first CI run.

---

## Tests

| File | Covers |
| --- | --- |
| `src/road/services/road/waypoint-writes.spec.ts` | one statement per operation, parameterisation, `positionByRank` ranking rules |
| `src/road/services/road/road.service.spec.ts` | which statements each path issues, id preservation, address cases |
| `src/common/dto/pagination.dto.spec.ts` | coercion, ceiling, and that nothing yields a nullish limit |
| `src/common/filters/all-exceptions.filter.spec.ts` | the P2010/SQLSTATE mapping |
| `test/integration/waypoint-order.integration-spec.ts` | the constraint's deferrability read from `pg_constraint`; permutations, insertion shifts, compaction against real Postgres |
| `test/integration/road-writes.integration-spec.ts` | all five write paths end to end, asserting on the rows that come back out |
| `test/responses.e2e-spec.ts` | pagination over real HTTP: defaults, query string, ceiling, blank value, ordering |

The split is deliberate. A Prisma mock has no unique constraint, no foreign keys and
no `ROW_NUMBER()`, so it can confirm *which* statements are issued but not that the
resulting rows are right. Since bulk-rewriting five write paths is the riskiest change
in this branch, both halves are asserted.

```
$ npm run format:check      # clean
$ npm run lint:check        # clean
$ npm run typecheck         # clean
$ npm test                  # 28 suites, 661 tests passed
$ npm run test:e2e          #  6 suites, 106 tests passed
$ npm run test:integration  #  3 suites,  62 tests passed  (real Postgres 16)
$ npx prisma migrate deploy # 60 migrations apply to an empty database
$ npx prisma migrate diff … # No difference detected
$ npx prisma db seed        # idempotent (run twice)
$ npm run build             # clean
```

---

## Behaviour changes for clients

| Route | Change |
| --- | --- |
| `POST /road/own-roads` | Accepts `?limit=&offset=`, defaults to the first 50, adds `meta`. Waypoints now come back ordered. |
| `GET /permissions/permit/get-all` | Same, ordered by name. |
| `GET /favorites` | Same, with `meta.roads` and `meta.waypoints`. A favourited road in `ownRoads` now carries its `wayPoints`, which only `othersRoads` did before. |
| `POST /road/create`, `PUT /road/update/:id` | Waypoint positions are normalised to 1..N from the payload's ranking. Previously duplicates were stored as sent. |
| `POST /road/add-waypoint/:id` | `order` is an insertion point; the response reports the position actually stored, which for an out-of-range value differs from the one requested. |
| all waypoint writes | A duplicate position is a 409 rather than silently stored. Unreachable through the API — positions are assigned — but reachable by a direct database write. |
| absent address parts | Stored as `NULL` rather than `''`. The old code wrote `address?.country || ''`, so "not supplied" and "supplied empty" were the same value and the nullable columns were never null. |

No client change is required: `limit`/`offset` are optional, `meta` is additive, and
every existing field is in the same place.

---

## Deliberately left

- **Offset, not cursor, pagination.** The client renders a scrollable list, not an
  append-only feed. Offset paging is the wrong choice at large offsets, where the
  database still walks the skipped rows; `MAX_PAGE_SIZE` and per-user scoping keep
  that off the table at this size.
- **`WAYPOINTS_MAX` stays at 500** even though a payload is no longer N inserts. The
  bound is now about request size rather than statement count.
- **`POST /road/share/:token` keeps its verb**, and share tokens still have no
  revocation path — changing the verb breaks the shipped client, and revocation needs
  a table.
- **The mobile client is untouched.** `validateRefreshToken` still needs to persist
  the rotated refresh token (step 4), and the three list screens could use `meta` to
  page. Both are noted rather than done; this branch is backend-only.
