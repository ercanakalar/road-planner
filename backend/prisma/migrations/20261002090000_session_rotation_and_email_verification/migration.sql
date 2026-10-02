-- Markers the authentication and notification code rely on.
--
-- "Road"."announcedAt" records that a route's followers were told about it,
-- so making it private and public again does not email them each time.
--
-- "Session"."rotatedAt" tells a refresh token that was exchanged for a new one
-- apart from one that was signed out. Rotated sessions are now kept (revoked)
-- until they expire instead of being deleted, so that presenting one again can
-- be recognised: within a short grace period it is a response the phone never
-- received, after that it is a replayed token.
--
-- "User"."emailVerifiedAt" records that whoever holds the account has proved
-- they receive mail at its address — through Google, or by completing a
-- password reset. A password set on an account whose address was never
-- proved may belong to someone else, so linking Google to it drops it.

-- AlterTable
ALTER TABLE "Session" ADD COLUMN "rotatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Road" ADD COLUMN "announcedAt" TIMESTAMP(3);

-- A route that is public today has already been announced.
UPDATE "Road" SET "announcedAt" = "updatedAt" WHERE "isPublic" = true;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);

-- Google has already proved the address of every account linked to it.
UPDATE "User" u
   SET "emailVerifiedAt" = u."createdAt"
  FROM "GoogleAuth" g
 WHERE g."userId" = u."id";
