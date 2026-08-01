# Road Planner — Backend

NestJS 10 + Prisma 6 + PostgreSQL API for the Road Planner app. Users register
(email/password or Google), build roads out of ordered waypoints, and favourite
roads and waypoints. Access control is JWT-based with table-driven RBAC.

## Documentation

| Document | Contents |
| --- | --- |
| [`docs/REVIEW.md`](./docs/REVIEW.md) | Baseline audit of database, backend, authentication and authorization, with a six-step remediation plan |
| [`docs/changes/`](./docs/changes/) | One document per remediation step: what changed, why, and how it was verified |

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
    strategy/      Passport JWT strategies (access, refresh)
  common/
    decorators/    @Public, @GetUser, @RequirePermission
    guards/        AccessGuard (global), AdminGuard, PermissionsGuard, RoadOwnerGuard
  config/          Environment schema and global app configuration
  favorites/       Favourite roads and waypoints
  notification/    Transactional email
  permissions/     Permit (role) administration
  prisma/          PrismaService
  road/            Roads, waypoints, addresses, share links
  testing/         Shared test doubles (excluded from the build)
  user/            Profile read and update
```

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
