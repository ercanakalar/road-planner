-- AlterTable
ALTER TABLE "Road" ADD COLUMN "archivedAt" TIMESTAMP(3);

-- DropIndex
DROP INDEX "Road_isPublic_createdAt_idx";

-- DropIndex
DROP INDEX "Road_userId_idx";

-- CreateIndex
CREATE INDEX "Road_userId_archivedAt_idx" ON "Road"("userId", "archivedAt");

-- CreateIndex
CREATE INDEX "Road_isPublic_archivedAt_createdAt_idx" ON "Road"("isPublic", "archivedAt", "createdAt");
