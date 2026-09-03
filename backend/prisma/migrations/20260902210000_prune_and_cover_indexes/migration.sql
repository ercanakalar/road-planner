-- Index maintenance, from reading every query the application actually issues.
-- Ten indexes out, four in.
--
-- Dropped because nothing reaches for them:
--   User_email_idx, User_nickName_idx          Both columns are already @unique, and
--                                              a unique constraint is itself an index.
--                                              These were exact duplicates.
--   Session_userId_idx                         Leftmost prefix of
--                                              Session_userId_revokedAt_idx, which
--                                              answers `where userId` by itself.
--   Session_expiresAt_idx,                     No query filters on expiresAt. It is
--   PasswordReset_expiresAt_idx                written, then compared on a row already
--                                              loaded by id or token hash. If a sweeper
--                                              job is ever added, it will want these back.
--   AddressInfo_country_province_district_idx  No query looks an address up by
--                                              country/province/district.
--   FavoriteRoad_userId_idx,                   Superseded by the new indexes below, which
--   FavoriteWaypoint_userId_idx                still answer `where userId` on their
--                                              leftmost column.
--
-- Replaced so the sort comes off the index:
--   Road_userId_archivedAt_idx and Road_isPublic_archivedAt_createdAt_idx both put
--   archivedAt ahead of the sort columns. Every list endpoint ends with
--   `order by createdAt desc, id desc`, and an `archivedAt IS NULL` term sitting in
--   the middle of an index stops Postgres using the rest of it for ordering — so it
--   read the whole matching set and sorted it per page. Indexing straight through to
--   (createdAt, id) and leaving archivedAt as a filter turns those into a backward
--   index scan that stops at the page size.
--
--   Measured with EXPLAIN ANALYZE on 200 users / 30k roads / 30k favourites, first
--   page of 50:
--       owner listing    150 rows + top-N heapsort  ->  50 rows, no sort
--       favourites       150 rows + top-N heapsort  ->  50 rows, no sort
--       discover feed   6000 rows + top-N heapsort  ->  50 rows, no sort
--   The discover feed is the one that mattered: it read every public road in the
--   table to return one page, so its cost grew with the whole table rather than
--   with the page.
--
-- The FK columns FavoriteRoad.roadId, FavoriteWaypoint.waypointId and
-- PasswordReset.userId keep their own indexes: Postgres does not index a foreign key
-- automatically, and ON DELETE CASCADE scans them on every parent delete.
-- DropIndex
DROP INDEX "AddressInfo_country_province_district_idx";

-- DropIndex
DROP INDEX "FavoriteRoad_userId_idx";

-- DropIndex
DROP INDEX "FavoriteWaypoint_userId_idx";

-- DropIndex
DROP INDEX "PasswordReset_expiresAt_idx";

-- DropIndex
DROP INDEX "Road_isPublic_archivedAt_createdAt_idx";

-- DropIndex
DROP INDEX "Road_userId_archivedAt_idx";

-- DropIndex
DROP INDEX "Session_expiresAt_idx";

-- DropIndex
DROP INDEX "Session_userId_idx";

-- DropIndex
DROP INDEX "User_email_idx";

-- DropIndex
DROP INDEX "User_nickName_idx";

-- CreateIndex
CREATE INDEX "FavoriteRoad_userId_createdAt_id_idx" ON "FavoriteRoad"("userId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "FavoriteWaypoint_userId_createdAt_id_idx" ON "FavoriteWaypoint"("userId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "Road_userId_createdAt_id_idx" ON "Road"("userId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "Road_isPublic_createdAt_id_idx" ON "Road"("isPublic", "createdAt", "id");

