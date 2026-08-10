-- AlterTable
ALTER TABLE "Road" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Road_isPublic_createdAt_idx" ON "Road"("isPublic", "createdAt");
