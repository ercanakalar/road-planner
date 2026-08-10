/*
  Warnings:

  - You are about to drop the column `latitude` on the `FavoriteWaypoint` table. All the data in the column will be lost.
  - You are about to drop the column `longitude` on the `FavoriteWaypoint` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "FavoriteWaypoint" DROP COLUMN "latitude",
DROP COLUMN "longitude";

-- CreateIndex
CREATE INDEX "AddressInfo_deletedAt_idx" ON "AddressInfo"("deletedAt");

-- CreateIndex
CREATE INDEX "FavoriteRoad_roadId_idx" ON "FavoriteRoad"("roadId");

-- CreateIndex
CREATE INDEX "FavoriteRoad_userId_deletedAt_idx" ON "FavoriteRoad"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "FavoriteWaypoint_waypointId_idx" ON "FavoriteWaypoint"("waypointId");

-- CreateIndex
CREATE INDEX "FavoriteWaypoint_userId_deletedAt_idx" ON "FavoriteWaypoint"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "GoogleAuth_deletedAt_idx" ON "GoogleAuth"("deletedAt");

-- CreateIndex
CREATE INDEX "ManuelAuth_deletedAt_idx" ON "ManuelAuth"("deletedAt");

-- CreateIndex
CREATE INDEX "Permission_deletedAt_idx" ON "Permission"("deletedAt");

-- CreateIndex
CREATE INDEX "Permit_deletedAt_idx" ON "Permit"("deletedAt");

-- CreateIndex
CREATE INDEX "Road_userId_deletedAt_idx" ON "Road"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "Tokens_resetToken_idx" ON "Tokens"("resetToken");

-- CreateIndex
CREATE INDEX "Tokens_deletedAt_idx" ON "Tokens"("deletedAt");

-- CreateIndex
CREATE INDEX "User_nickName_idx" ON "User"("nickName");

-- CreateIndex
CREATE INDEX "WayPoint_roadId_deletedAt_idx" ON "WayPoint"("roadId", "deletedAt");
