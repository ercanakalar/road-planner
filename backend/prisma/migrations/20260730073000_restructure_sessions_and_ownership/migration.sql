-- Restructure authentication storage and make ownership non-nullable.
--
-- Prisma's generated diff for this schema change would fail on any database with
-- real data in it: it converts four columns to NOT NULL without clearing the NULLs,
-- adds a unique index over a column with duplicates, and switches User.email to
-- CITEXT without creating the extension. The statements below do that preparation
-- first, in dependency order.
--
-- Sections:
--   0. citext extension
--   1. Guard: refuse to run if emails collide only by case
--   2. Delete rows that are already unreachable (orphans)
--   3. Give every waypoint its own AddressInfo
--   4. Carry forward any session that can be carried forward
--   5. Structural changes (the generated diff)

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. citext
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS citext;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Case-colliding emails
--
-- Under CITEXT, 'Foo@x.com' and 'foo@x.com' become the same key, so the unique
-- index would fail. Merging or deleting one of two real accounts is a decision no
-- migration should make silently, so this aborts with the offending addresses and
-- leaves the database untouched (the whole migration is one transaction).
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  offending text;
BEGIN
  SELECT string_agg(email, ', ') INTO offending FROM (
    SELECT lower("email") AS email FROM "User"
     GROUP BY lower("email") HAVING count(*) > 1
    UNION
    SELECT lower("email") FROM "ManuelAuth"
     GROUP BY lower("email") HAVING count(*) > 1
    UNION
    SELECT lower("email") FROM "GoogleAuth"
     GROUP BY lower("email") HAVING count(*) > 1
  ) AS duplicates;

  IF offending IS NOT NULL THEN
    RAISE EXCEPTION
      'Cannot convert email columns to citext: these addresses exist in more than one letter case: %. Merge or remove the duplicate accounts, then re-run this migration.',
      offending;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Orphans
--
-- Road.userId and WayPoint.roadId were nullable with ON DELETE SET NULL, so
-- deleting a user or a road left rows behind that no query could reach: they could
-- not be listed (every listing filters by owner) nor authorized (ownership was the
-- check). Deleting them is not data loss in any usable sense, and they cannot be
-- re-parented because the information about who owned them is exactly what was
-- nulled out.
--
-- Deepest first, since the cascade rules are not in place yet.
-- ─────────────────────────────────────────────────────────────────────────────

-- Favourites pointing at nothing.
DELETE FROM "FavoriteWaypoint" WHERE "waypointId" IS NULL;
DELETE FROM "FavoriteRoad"     WHERE "roadId"     IS NULL;

-- Favourites of waypoints that are themselves orphaned.
DELETE FROM "FavoriteWaypoint"
 WHERE "waypointId" IN (SELECT "id" FROM "WayPoint" WHERE "roadId" IS NULL);

-- Favourites and waypoints belonging to ownerless roads.
DELETE FROM "FavoriteWaypoint"
 WHERE "waypointId" IN (
   SELECT w."id" FROM "WayPoint" w
     JOIN "Road" r ON r."id" = w."roadId"
    WHERE r."userId" IS NULL
 );

DELETE FROM "FavoriteRoad"
 WHERE "roadId" IN (SELECT "id" FROM "Road" WHERE "userId" IS NULL);

DELETE FROM "WayPoint" WHERE "roadId" IS NULL;

DELETE FROM "WayPoint"
 WHERE "roadId" IN (SELECT "id" FROM "Road" WHERE "userId" IS NULL);

DELETE FROM "Road" WHERE "userId" IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. One AddressInfo per waypoint
--
-- The relation was many-to-one, so two waypoints could share an address — while
-- `deleteRoadById` deleted addresses by id, which would have destroyed an address
-- still in use by another road. The relation becomes 1:1 and owned.
--
-- Sharing is resolved by cloning rather than by nulling, so no address text is
-- lost. The waypoint with the lowest id keeps the original row.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  duplicate RECORD;
  new_id text;
BEGIN
  FOR duplicate IN
    SELECT w."id" AS waypoint_id, w."addressInfoId" AS address_id
      FROM "WayPoint" w
     WHERE w."addressInfoId" IS NOT NULL
       AND w."id" <> (
         SELECT min(w2."id") FROM "WayPoint" w2
          WHERE w2."addressInfoId" = w."addressInfoId"
       )
  LOOP
    new_id := gen_random_uuid()::text;

    INSERT INTO "AddressInfo"
      ("id", "country", "province", "district", "address", "createdAt", "updatedAt", "deletedAt")
    SELECT new_id, "country", "province", "district", "address", "createdAt", now(), "deletedAt"
      FROM "AddressInfo" WHERE "id" = duplicate.address_id;

    UPDATE "WayPoint" SET "addressInfoId" = new_id WHERE "id" = duplicate.waypoint_id;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Sessions
--
-- Tokens held one row per user, so a second device silently invalidated the first.
-- Session is one row per device.
--
-- A row is carried forward only when Tokens.refreshToken holds a SHA-256 digest
-- (64 hex characters) — the format written since the previous step. Anything else
-- is a raw JWT from before that change, and storing a raw token as though it were a
-- digest would make it unverifiable; those sessions end and the user signs in again.
--
-- expiresAt is set generously because the original expiry is not recorded here. It
-- is not the real bound: the refresh JWT's own `exp` is still verified on every
-- refresh, so a carried-forward row cannot outlive its token.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PasswordReset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Session" ("id", "userId", "refreshTokenHash", "expiresAt", "lastUsedAt", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  t."userId",
  t."refreshToken",
  now() + interval '30 days',
  COALESCE(t."updatedAt", now()),
  COALESCE(t."createdAt", now()),
  now()
FROM "Tokens" t
WHERE t."refreshToken" IS NOT NULL
  AND t."refreshToken" ~ '^[0-9a-f]{64}$'
  AND t."deletedAt" IS NULL;

-- Reset tokens are deliberately not carried forward. Before the previous step the
-- stored value was itself the emailed token, so importing it would preserve a grant
-- that was never safe. Outstanding reset links stop working; the flow is repeatable.

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Structural changes
-- ─────────────────────────────────────────────────────────────────────────────

-- DropForeignKey
ALTER TABLE "FavoriteRoad" DROP CONSTRAINT "FavoriteRoad_roadId_fkey";
ALTER TABLE "FavoriteRoad" DROP CONSTRAINT "FavoriteRoad_userId_fkey";
ALTER TABLE "FavoriteWaypoint" DROP CONSTRAINT "FavoriteWaypoint_userId_fkey";
ALTER TABLE "FavoriteWaypoint" DROP CONSTRAINT "FavoriteWaypoint_waypointId_fkey";
ALTER TABLE "GoogleAuth" DROP CONSTRAINT "GoogleAuth_tokenId_fkey";
ALTER TABLE "GoogleAuth" DROP CONSTRAINT "GoogleAuth_userId_fkey";
ALTER TABLE "ManuelAuth" DROP CONSTRAINT "ManuelAuth_tokenId_fkey";
ALTER TABLE "ManuelAuth" DROP CONSTRAINT "ManuelAuth_userId_fkey";
ALTER TABLE "Road" DROP CONSTRAINT "Road_userId_fkey";
ALTER TABLE "Tokens" DROP CONSTRAINT "Tokens_userId_fkey";
ALTER TABLE "WayPoint" DROP CONSTRAINT "WayPoint_roadId_fkey";

-- DropIndex
DROP INDEX "GoogleAuth_tokenId_key";
DROP INDEX "ManuelAuth_tokenId_key";

-- DropIndex: soft-delete indexes. The column was NULL in every row of every
-- table because no code path ever wrote it, so these indexed a constant.
DROP INDEX "AddressInfo_deletedAt_idx";
DROP INDEX "FavoriteRoad_userId_deletedAt_idx";
DROP INDEX "FavoriteWaypoint_userId_deletedAt_idx";
DROP INDEX "GoogleAuth_deletedAt_idx";
DROP INDEX "ManuelAuth_deletedAt_idx";
DROP INDEX "Permission_deletedAt_idx";
DROP INDEX "Permit_deletedAt_idx";
DROP INDEX "Road_deletedAt_idx";
DROP INDEX "Road_userId_deletedAt_idx";
DROP INDEX "User_deletedAt_idx";
DROP INDEX "WayPoint_deletedAt_idx";
DROP INDEX "WayPoint_roadId_deletedAt_idx";

-- AlterTable
ALTER TABLE "FavoriteRoad" ALTER COLUMN "roadId" SET NOT NULL;
ALTER TABLE "FavoriteWaypoint" ALTER COLUMN "waypointId" SET NOT NULL;
ALTER TABLE "GoogleAuth" DROP COLUMN "tokenId";
ALTER TABLE "ManuelAuth" DROP COLUMN "tokenId";
ALTER TABLE "Road" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "email" SET DATA TYPE CITEXT;
ALTER TABLE "ManuelAuth" ALTER COLUMN "email" SET DATA TYPE CITEXT;
ALTER TABLE "GoogleAuth" ALTER COLUMN "email" SET DATA TYPE CITEXT;
ALTER TABLE "WayPoint" ALTER COLUMN "roadId" SET NOT NULL;

-- DropColumn: soft delete, removed deliberately. See the note at the top of
-- prisma/schema.prisma — it was never implemented, so no data is lost.
ALTER TABLE "AddressInfo"      DROP COLUMN "deletedAt";
ALTER TABLE "FavoriteRoad"     DROP COLUMN "deletedAt";
ALTER TABLE "FavoriteWaypoint" DROP COLUMN "deletedAt";
ALTER TABLE "GoogleAuth"       DROP COLUMN "deletedAt";
ALTER TABLE "ManuelAuth"       DROP COLUMN "deletedAt";
ALTER TABLE "Permission"       DROP COLUMN "deletedAt";
ALTER TABLE "Permit"           DROP COLUMN "deletedAt";
ALTER TABLE "Road"             DROP COLUMN "deletedAt";
ALTER TABLE "User"             DROP COLUMN "deletedAt";
ALTER TABLE "WayPoint"         DROP COLUMN "deletedAt";

-- DropTable
DROP TABLE "Tokens";

-- CreateIndex
CREATE UNIQUE INDEX "Session_refreshTokenHash_key" ON "Session"("refreshTokenHash");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_userId_revokedAt_idx" ON "Session"("userId", "revokedAt");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
CREATE UNIQUE INDEX "PasswordReset_tokenHash_key" ON "PasswordReset"("tokenHash");
CREATE INDEX "PasswordReset_userId_idx" ON "PasswordReset"("userId");
CREATE INDEX "PasswordReset_expiresAt_idx" ON "PasswordReset"("expiresAt");
CREATE UNIQUE INDEX "WayPoint_addressInfoId_key" ON "WayPoint"("addressInfoId");

-- AddForeignKey
ALTER TABLE "ManuelAuth" ADD CONSTRAINT "ManuelAuth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GoogleAuth" ADD CONSTRAINT "GoogleAuth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PasswordReset" ADD CONSTRAINT "PasswordReset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Road" ADD CONSTRAINT "Road_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WayPoint" ADD CONSTRAINT "WayPoint_roadId_fkey" FOREIGN KEY ("roadId") REFERENCES "Road"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FavoriteRoad" ADD CONSTRAINT "FavoriteRoad_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FavoriteRoad" ADD CONSTRAINT "FavoriteRoad_roadId_fkey" FOREIGN KEY ("roadId") REFERENCES "Road"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FavoriteWaypoint" ADD CONSTRAINT "FavoriteWaypoint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FavoriteWaypoint" ADD CONSTRAINT "FavoriteWaypoint_waypointId_fkey" FOREIGN KEY ("waypointId") REFERENCES "WayPoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
