-- Following an author.
--
-- One row per (follower, author) pair. The unique constraint is what makes the
-- follow toggle idempotent: two taps in quick succession cannot leave two rows
-- behind, and the second insert is a no-op rather than a duplicate.
--
-- The index on "authorId" is the one that matters at publish time: turning a
-- road public reads every follower of its author, and that is a lookup by
-- author alone.
CREATE TABLE "AuthorFollow" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthorFollow_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AuthorFollow_followerId_authorId_key" ON "AuthorFollow"("followerId", "authorId");

CREATE INDEX "AuthorFollow_authorId_idx" ON "AuthorFollow"("authorId");

ALTER TABLE "AuthorFollow"
  ADD CONSTRAINT "AuthorFollow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AuthorFollow"
  ADD CONSTRAINT "AuthorFollow_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
