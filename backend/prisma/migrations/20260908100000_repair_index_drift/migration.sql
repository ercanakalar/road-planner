-- Reconciles the index set from 20260902210000_prune_and_cover_indexes on a
-- database whose history has drifted.
--
-- That migration writes bare DROP INDEX / CREATE INDEX, so it only applies to a
-- database whose indexes are exactly what the migrations before it left behind.
-- On a database that was also touched by `prisma db push` — where a push had
-- already removed one of those indexes — the first DROP raises 42704, Postgres
-- rolls the whole file back, and Prisma records the migration as failed. From
-- then on `migrate deploy` refuses to apply anything at all, which is how a
-- schema difference becomes a deploy that cannot ship.
--
-- Nothing here asserts prior state. Every statement is a no-op once its work is
-- done, and the favourite table is addressed by whichever name it currently
-- has, because a database may already have been through the Stop rename that
-- follows this file — migrations are applied in filename order, not in the
-- order they reached any particular database.
DROP INDEX IF EXISTS "AddressInfo_country_province_district_idx";
DROP INDEX IF EXISTS "FavoriteRoad_userId_idx";
DROP INDEX IF EXISTS "FavoriteWaypoint_userId_idx";
DROP INDEX IF EXISTS "FavoriteStop_userId_idx";
DROP INDEX IF EXISTS "PasswordReset_expiresAt_idx";
DROP INDEX IF EXISTS "Road_isPublic_archivedAt_createdAt_idx";
DROP INDEX IF EXISTS "Road_userId_archivedAt_idx";
DROP INDEX IF EXISTS "Session_expiresAt_idx";
DROP INDEX IF EXISTS "Session_userId_idx";
DROP INDEX IF EXISTS "User_email_idx";
DROP INDEX IF EXISTS "User_nickName_idx";

CREATE INDEX IF NOT EXISTS "FavoriteRoad_userId_createdAt_id_idx" ON "FavoriteRoad"("userId", "createdAt", "id");
CREATE INDEX IF NOT EXISTS "Road_userId_createdAt_id_idx" ON "Road"("userId", "createdAt", "id");
CREATE INDEX IF NOT EXISTS "Road_isPublic_createdAt_id_idx" ON "Road"("isPublic", "createdAt", "id");

-- The favourite-stop table is FavoriteWaypoint before the rename and
-- FavoriteStop after it, and its foreign key column changes name with it. Both
-- are covered so this file does not care which side of that it runs on.
DO $$
BEGIN
  IF to_regclass('"FavoriteWaypoint"') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS "FavoriteWaypoint_userId_createdAt_id_idx" ON "FavoriteWaypoint"("userId", "createdAt", "id")';
  ELSIF to_regclass('"FavoriteStop"') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS "FavoriteStop_userId_createdAt_id_idx" ON "FavoriteStop"("userId", "createdAt", "id")';
  END IF;
END $$;
