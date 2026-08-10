-- Password reset gains a second channel.
--
-- The browser keeps the emailed link. A native app cannot open one, so it gets
-- five digits that are exchanged for the same token before the change is
-- allowed. One table serves both; `channel` says which.
--
-- Existing rows are deleted rather than migrated: they predate `verifiedAt`,
-- which the reset now requires, and a reset is cheap to request again.
DELETE FROM "PasswordReset";

CREATE TYPE "PasswordResetChannel" AS ENUM ('LINK', 'CODE');

ALTER TABLE "PasswordReset"
  ADD COLUMN "channel" "PasswordResetChannel" NOT NULL DEFAULT 'LINK',
  ADD COLUMN "codeHash" TEXT,
  ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lockedUntil" TIMESTAMP(3),
  ADD COLUMN "verifiedAt" TIMESTAMP(3);

-- Null until the code is verified on the CODE channel.
ALTER TABLE "PasswordReset" ALTER COLUMN "tokenHash" DROP NOT NULL;
