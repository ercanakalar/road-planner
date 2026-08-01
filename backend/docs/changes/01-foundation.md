# Step 1 — Test harness, configuration validation, bootstrap hardening

Closes findings **C9**, **H6**, **H7**, **H11**, **Q1** (typing half) and **Q7**
(tsconfig) from [REVIEW.md](../REVIEW.md).

No behavioural change to any endpoint's contract. Route paths are unchanged: the
`api/` prefix moved from the controllers to a global prefix, which produces the same
URLs.

---

## Why this had to come first

The audit found nine critical issues. None of them would have survived a working
test suite — and the suite did not run at all:

```
Test Suites: 11 failed, 5 passed, 16 total
Tests:        3 failed, 5 passed,  8 total
```

Every later step in the plan changes security-relevant behaviour. Without a harness
that executes, there is no way to demonstrate that a fix works or that it stays
fixed. So this step buys the ability to verify, and nothing else.

---

## What changed

### 1. The test harness runs

**`jest.config.js`** (new; the `jest` key is removed from `package.json`)

The root cause of the 11 broken suites: the source imports itself with absolute
specifiers (`import { PrismaService } from 'src/prisma/prisma.service'`), which
`tsc` resolves through `baseUrl` but Jest's resolver does not. Every spec that
transitively imported one of those died with `Cannot find module`.

```js
moduleNameMapper: { '^src/(.*)$': '<rootDir>/src/$1' }
```

Also added:

- `setupFiles: ['reflect-metadata']` — decorator metadata is emitted as
  module-scope `Reflect.getMetadata` calls, which throw without the polyfill.
- `setupFilesAfterEnv` pointing at `src/testing/setup.ts`, which silences the Nest
  logger so that specs exercising error paths do not bury real failures in noise.
- `clearMocks` / `restoreMocks` — leaked mock state between tests is a source of
  order-dependent passes.
- `collectCoverageFrom` excluding modules, DTOs and `main.ts`, none of which carry
  branches worth measuring.

**Specs removed and rewritten.** The deleted stubs were not tests: they asserted
`toBeDefined()` on constructors invoked with no arguments (a compile error), or
called methods that do not exist. Replaced with behavioural tests:

| Spec | Tests | Notable coverage |
| --- | --- | --- |
| `config/env.validation.spec.ts` | 45 | Every required variable, secret length, JWT lifetime formats |
| `auth/helper/helper.service.spec.ts` | 27 | Hash/compare round-trips, token-class isolation, finite expiry |
| `notification/email/email.service.spec.ts` | 12 | TLS verification, failure surfacing |
| `common/guards/*.spec.ts` | 30 | Deny-by-default, ownership, permission checks |
| `config/bootstrap.spec.ts` | 8 | CORS origin parsing |
| `auth/service/*/…spec.ts` | 20 | Sign-in/out paths, unseeded-database failure |

`src/app.controller.spec.ts` was deleted rather than fixed. It tested
`getHello()` — a method that does not exist — on `AppController`, which is not
registered in `AppModule`. Removing the dead source is step 3's scope.

**`test/app.e2e-spec.ts`** was rewritten from scratch. It previously asserted that
`GET /` returns `'Hello World!'`; no such route exists. It now boots the real
`AppModule` with `PrismaService` replaced by a stub, so it needs no database, and
verifies the composition that every other step depends on:

- routes are served under `/api` and not without it;
- all ten protected routes reject an unauthenticated request with 401;
- a malformed `Authorization` header yields 401, not 500;
- a JWT signed with the wrong secret is rejected;
- `@Public()` routes pass the global guard.

### 2. Configuration is validated at boot

**`src/config/env.validation.ts`** (new) — a `class-validator` schema over
`process.env`, wired into `ConfigModule.forRoot({ validate })`. A missing or
malformed variable now aborts startup with every problem listed at once:

```
Invalid environment configuration:
  - ACCESS_KEY: ACCESS_KEY must be at least 32 characters. Generate one with: openssl rand -base64 48
  - FRONTEND_URL: FRONTEND_URL must be a URL address

See .env.example for the full list of variables.
```

Three properties are worth calling out:

- **Secrets are length-checked** (≥ 32 chars) rather than merely present.
- **JWT lifetimes are format-checked.** This is a security control, not tidiness:
  `signAsync` accepts an `undefined` `expiresIn` and mints a token with **no `exp`
  claim at all**. An unset `ACCESS_EXPIRES_IN` therefore produced non-expiring
  credentials, silently. Now it cannot boot.
- **Google OAuth is optional as a group**, so the app runs without it instead of
  crashing on `undefined.split(',')`.

**`src/config/config.module.ts`** (new) registers `@nestjs/config` **once**, with
`isGlobal: true`. The five feature modules that each called
`ConfigModule.forRoot()` no longer do.

### 3. The bootstrap hardens the app

**`src/config/bootstrap.ts`** (new) holds every global concern in a `configureApp`
function that both `main.ts` and the e2e suite call. That sharing is the point: the
first draft of this step put the configuration inline in `main.ts` and had the e2e
spec import `API_PREFIX` from it — which executed `bootstrap()` as an import side
effect and tried to open a database connection during the test run.

Added, none of which existed before:

| Concern | Note |
| --- | --- |
| `helmet()` | Standard security response headers |
| `enableCors` | Driven by `CORS_ORIGINS`; an empty list denies rather than allows |
| `setGlobalPrefix('api')` | Replaces `api/` hardcoded into five `@Controller` paths |
| `ValidationPipe` options | `whitelist`, `forbidNonWhitelisted`, `transform` |
| `enableShutdownHooks()` | Without it, SIGTERM killed the process before Prisma closed its pool |
| `PORT` | Was hardcoded to 3000 |

The `ValidationPipe` options are the groundwork for step 2, not the fix itself:
`whitelist` strips properties with no matching decorator, and today no DTO has any
decorators, so nothing is stripped yet. Step 2 adds the decorators that give this
teeth.

### 4. TypeScript is strict

`tsconfig.json` had `strictNullChecks` and `noImplicitAny` but not `strict`. Now
enabled: `strict`, `noImplicitOverride`, `noUnusedLocals`, `noUnusedParameters`,
`noImplicitReturns`.

This immediately surfaced the empty JWT payload types (finding Q1):

```ts
export type AccessTokenType = {};   // accepts any non-nullish value
export type RefreshTokenType = {};
```

`createAccessToken(data: AccessTokenType)` therefore had no contract whatsoever.
Both now declare their actual claims. The remaining half of Q1 — dropping the
unused `permissions` array from the payload and adding `jti` — is step 4.

`include` is now explicit (`src/**/*`, `test/**/*`). A bare `exclude` pulled
`prisma/seed.ts` into the program, which shifted the inferred `rootDir` and emitted
to `dist/src/` — breaking `start:prod`, which runs `node dist/main`.

### 5. Continuous integration

**`.github/workflows/backend-ci.yml`** (new — there was no `.github/` at all).

Two jobs:

1. **verify** — format check, lint, typecheck, unit tests, e2e tests, build.
2. **migrations** — applies every migration to an empty Postgres 16, then runs
   `prisma migrate diff --exit-code` to catch `schema.prisma` edits that were never
   turned into a migration.

`lint:check`, `format:check` and `typecheck` scripts were added; `lint` keeps
`--fix` for local use. `.eslintrc.js` gained an `argsIgnorePattern: '^_'` so ESLint
agrees with `noUnusedParameters` about intentionally-unused parameters.

### 6. Smaller items

- **`@prisma/internals` removed from `dependencies`** (H11). A heavyweight internal
  package that nothing in `src/` imports.
- **`helmet` added.**
- **`.env.example` completed** — it was missing twelve variables the code reads
  (`FRONTEND_URL`, all five `GOOGLE_*`, `ROAD_SHARE_KEY`, `MAIL_*`) and listed
  `CREATE_TABLES`, which nothing reads. Every entry now notes whether it is
  required and what the default is.
- **`EmailService` reads configuration through `ConfigService`** instead of
  `process.env`, and **verifies TLS certificates**. It previously hardcoded
  `rejectUnauthorized: false` with `ciphers: 'SSLv3'` — accepting any certificate
  over a protocol retired in 2015. Overridable via
  `MAIL_TLS_REJECT_UNAUTHORIZED=false` for local SMTP with a self-signed cert.
- **`prisma:generate` / `prisma:migrate` / `prisma:seed` scripts** added so CI and
  humans invoke the same commands.

---

## Verification

```
$ npm run format:check   # All matched files use Prettier code style
$ npm run lint:check     # clean
$ npm run typecheck      # clean
$ npm test               # 15 suites, 147 tests passed
$ npm run test:e2e       #  1 suite,   19 tests passed
$ npm run build          # dist/main.js emitted
```

Before this step: 11 of 16 suites failed to run.

---

## Deliberately not addressed

Left for the steps that own them, so each change arrives with its own tests:

- **No DTO carries validation decorators yet** — the pipe is configured but has
  nothing to enforce. The mass-assignment privilege escalation (C2) is still open.
  → step 2.
- **`getWaypointById` still ignores its `userId` argument.** Marked with an
  explicit `FIXME(C5)` rather than quietly renamed, so the IDOR stays visible.
  → step 3.
- **Dead code retained**: `GoogleGuard`, `ResetGuard`, `ResetStrategy`, `Roles`,
  `FileManagementService`, `AppController`, `AppService`. → step 3.
- **No global exception filter or response interceptor.** → step 6.
- **`Dockerfile` still copies `.env` into an image layer** (H10). → step 6.
