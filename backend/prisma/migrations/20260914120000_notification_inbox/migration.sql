-- An inbox, so following somebody shows up in the app and not only by email.
--
-- The row holds who and what rather than a rendered sentence: the wording can
-- then change, and be translated, without rewriting anybody's history.
CREATE TYPE "NotificationKind" AS ENUM ('ROUTE_PUBLISHED');

CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "NotificationKind" NOT NULL,
    "actorId" TEXT,
    "roadId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- Publishing the same route twice is not news twice. This is what makes the
-- write at publish time safe to repeat.
CREATE UNIQUE INDEX "Notification_userId_roadId_kind_key" ON "Notification"("userId", "roadId", "kind");

-- The inbox is read newest first, by one person at a time.
CREATE INDEX "Notification_userId_createdAt_id_idx" ON "Notification"("userId", "createdAt", "id");

-- And counted by how much of it is unread.
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The actor going away leaves the line readable rather than deleting news that
-- already happened; the route going away takes it, since there is nothing left
-- to open.
ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_roadId_fkey" FOREIGN KEY ("roadId") REFERENCES "Road"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Where each person wants to hear about it. Both on by default: a notification
-- only ever arrives because somebody was followed on purpose, and an empty
-- inbox after following somebody reads as broken.
ALTER TABLE "User"
  ADD COLUMN "notifyInApp" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "notifyByEmail" BOOLEAN NOT NULL DEFAULT true;
