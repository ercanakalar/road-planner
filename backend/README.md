# Travel Routes — Backend

NestJS 10 + Prisma 6 + PostgreSQL API for the Travel Routes app. Users register
(email/password or Google), build roads out of ordered waypoints, and favourite
roads and waypoints. Access control is JWT-based with table-driven RBAC.

## Documentation

| Document | Contents |
| --- | --- |
| [`docs/REVIEW.md`](./docs/REVIEW.md) | Baseline audit of database, backend, authentication and authorization, with a six-step remediation plan |
| [`docs/changes/`](./docs/changes/) | One document per remediation step: what changed, why, and how it was verified |
| [`docs/changes/07-maps-on-the-server.md`](./docs/changes/07-maps-on-the-server.md) | Why the Google Maps key and every map call moved off the phone |
| [`docs/changes/08-google-sign-in.md`](./docs/changes/08-google-sign-in.md) | Why Google sign-in stalled on the phone, and where the profile it returns is stored |
| [`docs/DEPLOY.md`](./docs/DEPLOY.md) | Releasing: accounts, database, keys and cost, step by step for a first deploy |

## Getting started

```bash
npm ci
cp .env.example .env          # then fill in the required values
npm run prisma:generate
npm run prisma:migrate        # applies migrations
npm run prisma:seed           # creates the ADMIN / USER permits
npm run start:dev
```

The API listens on `PORT` (default `3000`) under the `/api` prefix, e.g.
`POST http://localhost:3000/api/auth/sign-in`.

### Docker

```bash
docker compose up backend test-db     # from the repository root
```

Postgres is exposed on host port `5434`.

### Against a managed Postgres (Cloud SQL)

**The instance has to be PostgreSQL.** Cloud SQL's console offers MySQL first,
and MySQL will not run this schema: it uses `citext` columns, a `CREATE
EXTENSION citext`, and a `DEFERRABLE INITIALLY DEFERRED` unique constraint.
`DATABASE_URL` is validated at boot and rejects anything that is not
`postgresql://`, so a wrong engine fails immediately rather than halfway
through a migration. Postgres 16 is what the migrations were written against.

1. On the instance, create the database and a user for the app.

   A public IP accepts nothing until the address is in **Connections →
   Networking → Authorized networks**; until then every client fails with
   Prisma's `P1001`, which is a TCP failure and says nothing about
   credentials. `nc -vz HOST 5432` separates that from a wrong connection
   string. The proxy in step 3 avoids the allowlist entirely, which matters
   because a home IP changes and each change locks the database out again —
   and because it tunnels over 443, which also gets past a network that
   blocks outbound 5432.

   To run the proxy without installing anything, start just that service and
   connect to `127.0.0.1:5432`:

   ```bash
   CLOUD_SQL_INSTANCE=PROJECT:REGION:INSTANCE \
   GOOGLE_APPLICATION_CREDENTIALS_FILE=/path/to/key.json \
     docker compose -f docker-compose.yml -f docker-compose.cloudsql.yml \
     up cloudsql-proxy
   ```

2. **Run the migrations as the `postgres` user**, not the application user.
   Migration `20260730073000_restructure_sessions_and_ownership` issues
   `CREATE EXTENSION IF NOT EXISTS citext`, which needs the `cloudsqlsuperuser`
   role that Cloud SQL's built-in `postgres` user has and a user you create
   does not:

   ```bash
   DATABASE_URL="postgresql://postgres:...@HOST:5432/roaddb?schema=public&sslmode=require" \
     npm run prisma:migrate
   DATABASE_URL="postgresql://postgres:...@HOST:5432/roaddb?schema=public&sslmode=require" \
     npm run prisma:seed
   ```

   The seed is idempotent, so running it twice is safe.

   **Not `prisma db push`.** It applies the schema without running the
   migration SQL, and two things live only there: the `citext` extension,
   without which every `@db.Citext` column fails to create, and the
   `DEFERRABLE INITIALLY DEFERRED` unique constraint on `WayPoint`. `db push`
   would create that one as an ordinary unique constraint, and reordering
   stops would then fail mid-statement — the exact thing it exists to
   prevent, and not visible until someone drags a waypoint.

3. Point the app at it with the application user. Through the Auth Proxy, from
   the repository root:

   ```bash
   CLOUD_SQL_INSTANCE=PROJECT:REGION:INSTANCE \
   GOOGLE_APPLICATION_CREDENTIALS_FILE=/path/to/key.json \
   DATABASE_URL='postgresql://USER:PASSWORD@cloudsql-proxy:5432/roaddb?schema=public&connection_limit=5' \
     docker compose -f docker-compose.yml -f docker-compose.cloudsql.yml up backend
   ```

   The service account needs `roles/cloudsql.client`. The proxy is preferred
   over a public IP with an authorised network because a home or office address
   changes, and every change locks the database out until the allowlist is
   edited.

   `.env.example` lists the connection string shapes for a public IP and for a
   Unix socket instead.

4. Set `connection_limit` explicitly. Prisma sizes its pool at `cpus * 2 + 1`
   per instance while a shared-core tier allows roughly 25 connections in
   total, so two containers on a 4-core host can exhaust it between them.

Confirm the wiring end to end before pointing the app at it:

```bash
curl http://localhost:3000/api/health
```

## Deploying to Cloud Run

```bash
cp .env.production.example .env.production   # fill it in; it is git-ignored
scripts/setup-cloudrun.sh                    # once per project
scripts/deploy-cloudrun.sh                   # every deploy
```

[`docs/DEPLOY.md`](./docs/DEPLOY.md) is the long version: which accounts and
keys these need first, what each part costs, and how to keep that near zero.

Both scripts read `.env.production`. Anything already exported wins over the
file, so `MAX_INSTANCES=8 scripts/deploy-cloudrun.sh` is a one-off override
rather than an edit to revert.

Four things about this shape are deliberate.

**The database can be Cloud SQL or anywhere.** A `DATABASE_URL` in
`.env.production` is used as given and no Cloud SQL is wired up at all — which
is what puts a managed Postgres on someone else's free tier within reach, since
Cloud SQL has no free tier of its own. Left empty, the URL is built from
`CLOUD_SQL_INSTANCE` and the `DB_` values, and the rest of this section applies.

**Cloud Run reaches Cloud SQL over a Unix socket**, not the public IP.
`--set-cloudsql-instances` mounts `/cloudsql/INSTANCE` into the container and
`DATABASE_URL` names that directory as its `host`. Nothing crosses the public
internet, so the instance needs no authorised network and no public IP at all —
which is worth knowing if connecting from a laptop has been a fight.

**Migrations run as a Cloud Run Job before the service is updated**, and the
deploy waits on it. A revision that goes live before its migrations serves
requests against a schema it does not expect, and the failure looks like
unrelated 500s. The job runs the `migrator` image: `prisma migrate deploy` needs
the Prisma CLI, which lives in devDependencies and is pruned out of the runtime
image, so promoting it would ship a CLI to every instance to be used never.

**Uploaded avatars go to a Cloud Storage bucket mounted as a directory.** Cloud
Run's disk is per-instance and ephemeral: local files vanish on deploy and are
invisible to the other instances. Mounting the bucket at `/mnt/uploads` and
pointing `UPLOAD_DIR` at it keeps `avatar.storage.ts` unchanged — it calls
`writeFile` either way. Needs `--execution-environment=gen2`.

**`PORT` is never set.** Cloud Run injects it and the app reads it. Passing a
second opinion is how a container ends up listening where nothing is looking,
and the deploy then fails a health check that never had a chance.

`connection_limit` in `DATABASE_URL` is per instance and Cloud Run runs several.
The ceiling is `max-instances × connection_limit`; the defaults here are 4 and 3,
against roughly 25 that a shared-core Cloud SQL tier allows. Exhausting it looks
like intermittent timeouts rather than an error that names the cause.

`FRONTEND_URL` is required at boot and is the service's own address, which does
not exist until the service does. The deploy resolves that itself: it reuses the
address when the service is there, and otherwise boots the first revision on a
placeholder and corrects it once Cloud Run assigns the real one. It prints all
three URLs to paste into `.env.production`, where a custom domain would go
instead. `.env.production.example` lists every variable and which are secrets.

## Configuration

Every environment variable is validated at boot by
[`src/config/env.validation.ts`](./src/config/env.validation.ts). A missing or
malformed value aborts startup with all problems listed at once, rather than
surfacing as a 500 on whichever request needs it first.

`.env.example` documents each variable, whether it is required, and its default.
Secrets must be at least 32 characters:

```bash
openssl rand -base64 48
```

Use **different** values for `ACCESS_KEY`, `REFRESH_KEY` and `ROAD_SHARE_KEY` —
sharing one secret across token classes would let one be replayed as another.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run start:dev` | Watch mode |
| `npm run start:prod` | Run the compiled build (`npm run build` first) |
| `npm test` | Unit tests |
| `npm run test:cov` | Unit tests with coverage |
| `npm run test:e2e` | End-to-end tests (no database required) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` / `lint:check` | ESLint, with and without `--fix` |
| `npm run format` / `format:check` | Prettier, with and without writing |
| `npm run prisma:generate` | Regenerate the Prisma client |
| `npm run prisma:migrate` | Apply migrations (`migrate deploy`) |
| `npm run prisma:seed` | Seed permits and permissions |

CI runs format, lint, typecheck, both test suites and the build, plus a job that
applies all migrations to an empty database and checks `schema.prisma` for drift.
See [`.github/workflows/backend-ci.yml`](../.github/workflows/backend-ci.yml).

## Layout

```
src/
  auth/            Sign-up/in/out, refresh, password reset, Google OAuth
    helper/        Password hashing and JWT issuing
    strategy/      AccessStrategy, the one Passport JWT strategy in use
  common/
    decorators/    @Public, @GetUser, @RequirePermission
    guards/        AccessGuard (global), AdminGuard, PermissionsGuard, RoadOwnerGuard
  config/          Environment schema and global app configuration
  favorites/       Favourite roads and waypoints
  notification/    Transactional email
  permissions/     Permit (role) administration
  maps/            Google Maps proxy: directions, geocoding, place search
  prisma/          PrismaService
  road/            Roads, waypoints, share links
  testing/         Shared test doubles (excluded from the build)
  user/            Profile read and update
```

## Database indexes

Every index is there to serve a query someone can point at. Three rules keep the
set honest, and `prisma/migrations/20260902210000_prune_and_cover_indexes`
applies them:

**A `@unique` field is already indexed.** Postgres builds an index to enforce the
constraint, so a second `@@index` on the same column only costs writes. `User`
carried duplicates on both `email` and `nickName`.

**A composite index answers queries on its leftmost columns.** `@@index([userId,
revokedAt])` already serves `where userId`, so a separate `@@index([userId])` is
dead weight. The same holds for a `@@unique([userId, roadId])`.

**Index through to the sort, not just the filter.** Every list endpoint ends with
`order by createdAt desc, id desc`. An index that stops at the filter columns
makes Postgres read every matching row and sort it to return one page. Indexing
through the sort columns turns that into a backward index scan that stops at the
page size:

| Listing | Before | After |
| --- | --- | --- |
| Owner's roads | 150 rows + top-N heapsort | 50 rows, no sort |
| Favourites | 150 rows + top-N heapsort | 50 rows, no sort |
| Discover feed | 6000 rows + top-N heapsort | 50 rows, no sort |

Measured with `EXPLAIN ANALYZE` on 200 users / 30k roads / 30k favourites. The
discover feed is the one that mattered: it read every public road in the table to
return a page of 50, so its cost grew with the table rather than with the page.

One thing that looks removable and is not: `FavoriteRoad.roadId`,
`FavoriteWaypoint.waypointId` and `PasswordReset.userId` are indexed even though
no query filters on them alone. Postgres does not index a foreign key
automatically, and `ON DELETE CASCADE` scans those columns on every parent delete.

`Session.expiresAt` and `PasswordReset.expiresAt` were dropped because nothing
reads them in a `where` — both are written, then compared on a row already loaded
by id or token hash. A job that sweeps expired rows would want them back.

## Map lookups

All Google Maps traffic originates here. The app holds no key for the Directions,
Geocoding or Places web services; it posts coordinates and receives a decoded
route, an address, or a list of place suggestions.

| Route | Answers |
| --- | --- |
| `POST /api/maps/directions` | The line for a journey: decoded coordinates, seconds and metres |
| `POST /api/maps/durations` | How long the same journey takes by each transport mode |
| `GET /api/maps/geocode/reverse?latitude=&longitude=` | The address at a point |
| `GET /api/maps/places/search?input=&sessionToken=` | Place suggestions for what is being typed |
| `GET /api/maps/places/:placeId?sessionToken=` | Where a chosen suggestion is |
| `POST /api/maps/places/along-route` | Places within a radius of the journey itself, in the order they are passed |
| `GET /api/road/:id/route?mode=` | A stored road drawn as a line |
| `GET /api/road/:id/durations?modes=` | How long a stored road takes, per mode |

### Searching along a route

`POST /api/maps/places/along-route` answers "somewhere to eat, near the road I
am actually driving". It takes the same journey the directions endpoint takes —
`origin`, `destination`, optional `waypoints` and `mode` — plus what to look
for and how far off the road to look:

| Field | Meaning |
| --- | --- |
| `query` | Free text, as typed: `sushi`, `24 hour pharmacy` |
| `category` | One of the Google place types in `PLACE_CATEGORIES` (`restaurant`, `gas_station`, `lodging`, …) |
| `radiusMeters` | How far off the route still counts as on the way. 100–25000, default 2000 |
| `openNow`, `minRating` | Narrow the results further |
| `limit`, `sortBy` | How many to return, ordered by `detour` (default), `route` position or `rating` |

A search needs a `query`, a `category`, or both.

Google only ever answers "what is near this point", so the route is covered by
a chain of overlapping circles sampled along the decoded polyline. Each result
is then measured against the route line itself and dropped if it is further
than `radiusMeters` from it — which is what makes the radius a boundary rather
than a hint, and what separates a cafe one street off the motorway from one the
same distance from the destination as the crow flies.

Each result carries `distanceFromRouteMeters`, `distanceAlongRouteMeters` (how
far into the journey it is passed), a rough `detourMeters`, and
`insertAfterIndex` — the stop it is passed after, so adding it to the road puts
it in the order it will be driven. The response also
reports `searchedPoints` and `coversWholeRoute`: one search may spend at most
twelve billed Places requests, so a route too long to blanket at the radius
asked for is searched in circles that no longer touch, and says so rather than
letting a short list read as an empty stretch of road.

Adding or moving a waypoint no longer requires the caller to supply an address:
`address` is optional on `POST /api/road/add-waypoint/:id` and
`PUT /api/road/update-waypoint/:waypointId`, and the coordinates are
reverse-geocoded server-side when it is absent. A caller that already knows the
address — a road being migrated off a phone — keeps it, and no lookup is spent.
A failed lookup stores the waypoint as *Dropped pin* rather than losing it.

`address` is a single string on `WayPoint`: Google's `formatted_address` as it
read when the stop was placed. It was a table of its own — `AddressInfo`, joined
one-to-one, with country/province/district split out — which meant a create on
add, an update on move, a relink on replace and a delete when orphaned, all to
hold one line of text per waypoint that no query filtered or joined on for its
own sake. The formatted address already reads "Sultanahmet, Fatih/İstanbul,
Türkiye", so the app splits it on commas where it wants a place and a locality
on separate lines.

It is a label, not a record of the place. Nothing refreshes it but moving the
stop, and it is never queried — treat it as cached display text, and read
coordinates when you need to know where something is.

Three things stand between `MAP_API_KEY` and the internet, because these routes
are `@Public()` — a shared road opens from a link, and the offline map runs
before sign-in:

- **Per-endpoint throttling** (`MAPS_THROTTLE` in `src/config/throttle.ts`),
  sized against what one person's screen does rather than the global default.
- **Caching with expiry** in each service: routes for 10 minutes, addresses for
  a day, place details for a day. Concurrent identical requests share one
  upstream call, which is what a dragged pin produces.
- **Validation before spending.** A malformed coordinate, an unknown transport
  mode or a one-letter search is rejected without a billed request.

The road-level routes additionally reuse the road visibility rules, so a private
road cannot be traced by asking for directions along it.

Google's own errors are logged and answered generically — 503 when a retry might
help (quota, network, no key configured), 502 otherwise. Its `error_message` is
never repeated to the caller: it names the key.

## Authentication and authorization

`AccessGuard` is registered as a global `APP_GUARD`, so **every route requires a
valid access token unless it is marked `@Public()`**. Forgetting the decorator locks
a route down rather than opening it up.

Authorization layers on top, per route:

- `AdminGuard` — requires the `ADMIN` permit.
- `PermissionsGuard` + `@RequirePermission('X')` — requires a named permission.
- `RoadOwnerGuard` — requires the caller to own the road being acted on.

Both `AdminGuard` and `PermissionsGuard` read the caller's permit from the database
rather than from the token, so revoking a permission takes effect immediately
instead of at token expiry.

> **Note:** the authorization layer has known defects, including an IDOR on the
> waypoint routes and a privilege-escalation path through `POST /api/user/update`.
> See [`docs/REVIEW.md`](./docs/REVIEW.md) for the full list and the step that
> closes each one.
