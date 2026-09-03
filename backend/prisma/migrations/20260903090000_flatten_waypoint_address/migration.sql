-- Collapses AddressInfo into a single column on WayPoint.
--
-- The address is Google's, fetched when a stop is placed. A whole table, a
-- unique join column and a lifecycle to match — create on add, update on move,
-- relink on replace, delete when orphaned — existed to hold one string per
-- waypoint that no query ever filtered or joined on for its own sake.
--
-- Only the formatted address survives. country/province/district were split out
-- of that same string and were used for one subtitle line; the formatted
-- address already reads "Sultanahmet, Fatih/İstanbul, Türkiye".
--
-- Backfilled before the drop, so saved routes keep the addresses they had.

ALTER TABLE "WayPoint" ADD COLUMN "address" TEXT NOT NULL DEFAULT '';

UPDATE "WayPoint" AS wp
   SET "address" = ai."address"
  FROM "AddressInfo" AS ai
 WHERE wp."addressInfoId" = ai."id"
   AND ai."address" <> '';

ALTER TABLE "WayPoint" DROP CONSTRAINT IF EXISTS "WayPoint_addressInfoId_fkey";
DROP INDEX IF EXISTS "WayPoint_addressInfoId_key";
ALTER TABLE "WayPoint" DROP COLUMN "addressInfoId";

DROP TABLE "AddressInfo";
