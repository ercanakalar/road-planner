-- Waypoint ordering: make duplicates and gaps unrepresentable (D9).
--
-- `WayPoint.order` had no constraint, so two waypoints on one road could share a
-- position and positions could skip values. Every write path renumbered the whole
-- road afterwards to paper over it, one UPDATE per waypoint.
--
-- Three sections: normalise what is there, drop the index the constraint replaces,
-- add the constraint.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Renumber every road's waypoints to 1..N, contiguous.
--
-- Ordered by the current `order` so existing sequences are preserved; `createdAt`
-- then `id` break ties deterministically, which matters because a tie is exactly
-- the case this migration exists to eliminate — without a total order the result
-- would depend on the plan.
--
-- Safe to run before the constraint exists and pointless to run after: the
-- statement transiently assigns a value another row still holds.
-- ─────────────────────────────────────────────────────────────────────────────
WITH renumbered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "roadId"
      ORDER BY "order" ASC, "createdAt" ASC, id ASC
    ) AS new_order
  FROM "WayPoint"
)
UPDATE "WayPoint" AS wp
SET "order" = renumbered.new_order
FROM renumbered
WHERE wp.id = renumbered.id
  AND wp."order" <> renumbered.new_order;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Drop the plain index the unique constraint supersedes.
--
-- Both cover (roadId, order); keeping the plain one would mean maintaining two
-- indexes for the same lookups.
-- ─────────────────────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS "WayPoint_roadId_order_idx";

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Add the constraint, deferred to the end of the transaction.
--
-- Raw SQL rather than a Prisma-generated statement because `schema.prisma` cannot
-- express deferrability. Without it a reorder is impossible to express as one
-- statement: permuting positions transiently duplicates a value, and a
-- non-deferrable unique index checks per row —
--
--   UPDATE "WayPoint" SET "order" = v.ord FROM (VALUES ('a',3),('b',1),('c',2)) …
--   ERROR:  duplicate key value violates unique constraint
--
-- even though the end state is perfectly unique. Deferred, the same statement
-- succeeds and a genuine duplicate is still rejected at commit.
--
-- `prisma migrate diff --exit-code` against this migration reports no drift, so
-- the constraint does not have to be hidden from Prisma to survive.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE "WayPoint"
  ADD CONSTRAINT "WayPoint_roadId_order_key" UNIQUE ("roadId", "order")
  DEFERRABLE INITIALLY DEFERRED;
