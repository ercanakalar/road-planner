-- KVKK consent trail, account-deletion log and usage statistics.
--
-- "ConsentRecord" and "AccountDeletion" deliberately have no foreign key to
-- "User". Their whole purpose is to outlive the account they describe: when a
-- person withdraws consent the account and everything attached to it is
-- deleted, and what remains is the proof that consent was given, that it was
-- withdrawn, and that the data was erased. The Regulation on the Deletion,
-- Destruction or Anonymisation of Personal Data (art. 7/3) requires those
-- records to be kept for at least three years. Neither table holds personal
-- data in clear: the subject is the former user id, and the e-mail address
-- survives only as a keyed hash.
--
-- "UsageEvent" is the statistics table: one row per feature use. Its user link
-- is ON DELETE SET NULL, so deleting an account anonymises that person's rows
-- instead of removing them, and the aggregate numbers stay correct.

-- CreateEnum
CREATE TYPE "ConsentAction" AS ENUM ('GRANTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "DeletionReason" AS ENUM ('CONSENT_WITHDRAWN');

-- CreateTable
CREATE TABLE "UsageEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "event" VARCHAR(64) NOT NULL,
    "detail" VARCHAR(32),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "action" "ConsentAction" NOT NULL,
    "noticeVersion" VARCHAR(32) NOT NULL,
    "language" VARCHAR(8) NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountDeletion" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "emailHash" VARCHAR(64) NOT NULL,
    "reason" "DeletionReason" NOT NULL,
    "noticeVersion" VARCHAR(32),
    "accountCreatedAt" TIMESTAMP(3) NOT NULL,
    "erased" JSONB NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountDeletion_pkey" PRIMARY KEY ("id")
);

-- The overview reads a time window across every event; the per-feature table
-- reads one event over a window; "my statistics" reads one person's window.
CREATE INDEX "UsageEvent_createdAt_idx" ON "UsageEvent"("createdAt");

CREATE INDEX "UsageEvent_event_createdAt_idx" ON "UsageEvent"("event", "createdAt");

CREATE INDEX "UsageEvent_userId_createdAt_idx" ON "UsageEvent"("userId", "createdAt");

CREATE INDEX "ConsentRecord_subjectId_createdAt_idx" ON "ConsentRecord"("subjectId", "createdAt");

-- One deletion per account: a retried withdrawal must not log twice.
CREATE UNIQUE INDEX "AccountDeletion_subjectId_key" ON "AccountDeletion"("subjectId");

-- Answering "was my account deleted?" starts from the address the person gives.
CREATE INDEX "AccountDeletion_emailHash_idx" ON "AccountDeletion"("emailHash");

CREATE INDEX "AccountDeletion_deletedAt_idx" ON "AccountDeletion"("deletedAt");

-- AddForeignKey
ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
