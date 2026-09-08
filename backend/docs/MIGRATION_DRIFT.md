# Recovering a stuck migration history

## The symptom

`prisma migrate deploy` stops and names one migration:

```
Error: P3009
migrate found failed migrations in the target database, new migrations will
not be applied.
```

or, the first time it happens:

```
Error: P3018
A migration failed to apply. New migrations cannot be applied before the error
is recovered from.
```

Once Prisma has written a failed row into `_prisma_migrations`, it applies
nothing further — not the migration that failed, and not any migration after it.

## Why it keeps happening here

Two databases in this project have drifted from what the migration folder
believes, in opposite directions:

- The **local dev database** was brought forward with `prisma db push` at some
  point. Push drops and creates without recording anything, so
  `20260902210000_prune_and_cover_indexes` — which drops ten indexes by name,
  with no `IF EXISTS` — hits an index that push had already removed, raises
  42704, and rolls the whole file back.
- The **Neon database** was renamed to `Stop`/`FavoriteStop` by a migration
  recorded as `20260908120000_rename_waypoint_to_stop`, which is not in this
  folder. Any later migration written against `WayPoint` or `FavoriteWaypoint`
  therefore raises 42P01 there, even though the same file applies cleanly
  everywhere else.

Migrations are applied in filename order, not in the order any particular
database reached them. A file whose timestamp puts it before the rename can
still be the first thing a renamed database runs.

## What was done about it

`20260908100000_repair_index_drift` and `20260908110000_rename_waypoint_to_stop`
are both written to assert nothing about prior state:

- every drop is `DROP INDEX IF EXISTS`, every create is
  `CREATE INDEX IF NOT EXISTS`, and the new column is
  `ADD COLUMN IF NOT EXISTS`;
- the table renames run only if the old name is still there and the new one is
  not, so a database already renamed skips them and still gets the column;
- the favourite-stop table is addressed by whichever name it currently has.

Both were tested against a fresh database and against a local copy rebuilt into
Neon's exact state (already renamed, no `elevation`, the out-of-repo rename row
present). Each converges to the same schema, and
`prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma`
comes back empty afterwards.

## Clearing a failed row

Editing the file is not enough on a database that already recorded the failure.
Clear the row first, then re-run:

```bash
# Use the direct, non-pooled URL — see below.
export DATABASE_URL='postgresql://…'

# The failed migration rolled back atomically, so nothing partial is in the
# database and the rewritten file is safe to run from the start.
npx prisma migrate resolve --rolled-back 20260908100000_repair_index_drift

npx prisma migrate deploy
```

Confirm afterwards:

```sql
SELECT column_name FROM information_schema.columns
 WHERE table_name = 'Stop' AND column_name = 'elevation';

SELECT indexname FROM pg_indexes
 WHERE indexname IN (
   'Road_userId_createdAt_id_idx',
   'Road_isPublic_createdAt_id_idx',
   'FavoriteRoad_userId_createdAt_id_idx',
   'FavoriteStop_userId_createdAt_id_idx'
 );
```

One row and four rows respectively.

## Never migrate over Neon's pooled endpoint

`DATABASE_URL` in `.env` points at `…-pooler.…neon.tech`. That is PgBouncer in
transaction mode, where prepared statements and `SET` do not survive between
statements — a documented way for Prisma Migrate to fail. The application is
fine on it; migrations are not. `docker-entrypoint.sh` already prefers
`DATABASE_URL_UNPOOLED` for the migrate step when one is set, and the Cloud Run
migration job takes its own secret. Set `DATABASE_URL_UNPOOLED` (Neon's direct
host, the same URL without `-pooler`) anywhere migrations are run by hand.

## Avoiding it next time

- Never `prisma db push` a database that a migration history also owns. Push is
  for throwaway databases; anything else drifts silently and only tells you at
  the next deploy.
- Write `DROP INDEX IF EXISTS` and guard renames on what is actually there. A
  statement that asserts prior state buys nothing and costs a rollback of
  everything around it.
- Keep `RUN_MIGRATIONS=false` on the Cloud Run service. Migrating from the
  entrypoint puts a database round trip on every cold start, runs it over
  whichever `DATABASE_URL` the service uses (the pooled one), and lets a
  migration problem stop the API from starting at all rather than just failing
  a deploy.
