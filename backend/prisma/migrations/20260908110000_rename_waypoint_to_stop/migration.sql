-- WayPoint becomes Stop, FavoriteWaypoint becomes FavoriteStop, and a stop
-- gains the ground height its slope is worked out from.
--
-- Written as renames rather than the create/copy/drop Prisma would generate for
-- a model rename, so no row is rewritten and no foreign key is rebuilt: this is
-- a catalogue-only change and stays fast on a table with rows in it.
--
-- Every step checks what is actually there first. One database has already been
-- renamed by a migration that is not in this folder, so this file has to be a
-- no-op on the half of the work that is already done and still deliver the
-- other half.
DO $$
BEGIN
  IF to_regclass('"WayPoint"') IS NOT NULL AND to_regclass('"Stop"') IS NULL THEN
    ALTER TABLE "WayPoint" RENAME TO "Stop";
  END IF;

  IF to_regclass('"FavoriteWaypoint"') IS NOT NULL
     AND to_regclass('"FavoriteStop"') IS NULL THEN
    ALTER TABLE "FavoriteWaypoint" RENAME TO "FavoriteStop";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'FavoriteStop'
       AND column_name = 'waypointId'
  ) THEN
    ALTER TABLE "FavoriteStop" RENAME COLUMN "waypointId" TO "stopId";
  END IF;
END $$;

-- Index and constraint names are cosmetic to the running application but not to
-- the next migration, which addresses them by name. Each is renamed only if it
-- is still called what this history says it should be.
DO $$
DECLARE
  renames CONSTANT text[][] := ARRAY[
    ['WayPoint_pkey',                            'Stop_pkey'],
    ['FavoriteWaypoint_pkey',                    'FavoriteStop_pkey'],
    ['FavoriteWaypoint_userId_waypointId_key',   'FavoriteStop_userId_stopId_key'],
    ['FavoriteWaypoint_userId_createdAt_id_idx', 'FavoriteStop_userId_createdAt_id_idx'],
    ['FavoriteWaypoint_waypointId_idx',          'FavoriteStop_stopId_idx']
  ];
  pair text[];
BEGIN
  FOREACH pair SLICE 1 IN ARRAY renames LOOP
    IF to_regclass(format('%I', pair[1])) IS NOT NULL
       AND to_regclass(format('%I', pair[2])) IS NULL THEN
      EXECUTE format('ALTER INDEX %I RENAME TO %I', pair[1], pair[2]);
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE
  renames CONSTANT text[][] := ARRAY[
    ['Stop',         'WayPoint_roadId_order_key',        'Stop_roadId_order_key'],
    ['Stop',         'WayPoint_roadId_fkey',             'Stop_roadId_fkey'],
    ['FavoriteStop', 'FavoriteWaypoint_userId_fkey',     'FavoriteStop_userId_fkey'],
    ['FavoriteStop', 'FavoriteWaypoint_waypointId_fkey', 'FavoriteStop_stopId_fkey']
  ];
  entry text[];
BEGIN
  FOREACH entry SLICE 1 IN ARRAY renames LOOP
    IF EXISTS (
      SELECT 1 FROM pg_constraint
       WHERE conname = entry[2]
         AND conrelid = to_regclass(format('%I', entry[1]))
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I RENAME CONSTRAINT %I TO %I', entry[1], entry[2], entry[3]
      );
    END IF;
  END LOOP;
END $$;

-- Ground height in metres above sea level. Null is what every existing row
-- gets: there is nothing to backfill it from, and the lookup happens when a
-- stop is next written.
ALTER TABLE "Stop" ADD COLUMN IF NOT EXISTS "elevation" DOUBLE PRECISION;
