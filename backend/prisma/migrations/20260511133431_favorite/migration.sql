/*
  Warnings:

  - You are about to drop the column `description` on the `FavoriteRoad` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `FavoriteRoad` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `FavoriteWaypoint` table. All the data in the column will be lost.
  - You are about to drop the column `latitude` on the `FavoriteWaypoint` table. All the data in the column will be lost.
  - You are about to drop the column `longitude` on the `FavoriteWaypoint` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `FavoriteWaypoint` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,roadId]` on the table `FavoriteRoad` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,waypointId]` on the table `FavoriteWaypoint` will be added. If there are existing duplicate values, this will fail.
  - Made the column `roadId` on table `FavoriteRoad` required. This step will fail if there are existing NULL values in that column.
  - Made the column `waypointId` on table `FavoriteWaypoint` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "FavoriteRoad" DROP CONSTRAINT "FavoriteRoad_roadId_fkey";

-- DropForeignKey
ALTER TABLE "FavoriteWaypoint" DROP CONSTRAINT "FavoriteWaypoint_waypointId_fkey";

-- DropIndex
DROP INDEX "FavoriteRoad_roadId_key";

-- DropIndex
DROP INDEX "FavoriteWaypoint_waypointId_key";

-- AlterTable
ALTER TABLE "FavoriteRoad" DROP COLUMN "description",
DROP COLUMN "title",
ALTER COLUMN "roadId" SET NOT NULL;

-- AlterTable
ALTER TABLE "FavoriteWaypoint" DROP COLUMN "description",
DROP COLUMN "latitude",
DROP COLUMN "longitude",
DROP COLUMN "title",
ALTER COLUMN "waypointId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "FavoriteRoad_roadId_idx" ON "FavoriteRoad"("roadId");

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteRoad_userId_roadId_key" ON "FavoriteRoad"("userId", "roadId");

-- CreateIndex
CREATE INDEX "FavoriteWaypoint_waypointId_idx" ON "FavoriteWaypoint"("waypointId");

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteWaypoint_userId_waypointId_key" ON "FavoriteWaypoint"("userId", "waypointId");

-- CreateIndex
CREATE INDEX "Road_userId_idx" ON "Road"("userId");

-- CreateIndex
CREATE INDEX "WayPoints_roadId_idx" ON "WayPoints"("roadId");

-- AddForeignKey
ALTER TABLE "FavoriteRoad" ADD CONSTRAINT "FavoriteRoad_roadId_fkey" FOREIGN KEY ("roadId") REFERENCES "Road"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteWaypoint" ADD CONSTRAINT "FavoriteWaypoint_waypointId_fkey" FOREIGN KEY ("waypointId") REFERENCES "WayPoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;
