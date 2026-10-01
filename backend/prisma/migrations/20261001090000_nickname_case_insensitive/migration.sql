-- Nicknames are unique regardless of letter case.
--
-- The unique index on "nickName" compared TEXT, so 'Ercan' and 'ercan' were two
-- different nicknames and both could be held at once. As CITEXT the column
-- compares case-insensitively, the existing unique index is rebuilt with that
-- comparison by the type change, and the service's "is it taken?" lookup gets
-- the same answer as the index without lowering anything itself.
--
-- Sections:
--   1. Blank nicknames become NULL
--   2. Case collisions: the oldest account keeps the nickname
--   3. The type change, and the index a drifted database may be missing

CREATE EXTENSION IF NOT EXISTS citext;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Blank nicknames
--
-- The API has trimmed blanks to "no nickname" for a while, but a row written
-- before that would hold '' and read as a taken nickname of nothing.
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE "User" SET "nickName" = NULL WHERE btrim("nickName") = '';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Case collisions
--
-- Under CITEXT, 'Ercan' and 'ercan' are the same key and the unique index could
-- not be rebuilt. Unlike an e-mail address, a nickname is only a display handle:
-- nothing signs in with it and nothing else points at it. So instead of
-- refusing to run, the account that chose it first keeps it, the later ones go
-- back to having none (their first name is shown instead) and can pick a new
-- one from their profile.
-- ─────────────────────────────────────────────────────────────────────────────

WITH ranked AS (
  SELECT "id",
         row_number() OVER (
           PARTITION BY lower("nickName")
           ORDER BY "createdAt", "id"
         ) AS position
    FROM "User"
   WHERE "nickName" IS NOT NULL
)
UPDATE "User" AS u
   SET "nickName" = NULL
  FROM ranked
 WHERE ranked."id" = u."id"
   AND ranked.position > 1;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Type change
--
-- ALTER ... TYPE rebuilds "User_nickName_key" with citext equality. A database
-- brought forward with `prisma db push` may not have that index at all (see
-- docs/MIGRATION_DRIFT.md), so it is created if it is missing rather than
-- assumed.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "User" ALTER COLUMN "nickName" SET DATA TYPE CITEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "User_nickName_key" ON "User"("nickName");
