/*
  Warnings:

  - A unique constraint covering the columns `[roadId]` on the table `FavoriteRoad` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[wayPointsId]` on the table `FavoriteWaypoint` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[favoriteWaypointId]` on the table `WayPoints` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Road" DROP CONSTRAINT "Road_favoriteRoadId_fkey";

-- DropForeignKey
ALTER TABLE "WayPoints" DROP CONSTRAINT "WayPoints_favoriteWaypointId_fkey";

-- AlterTable
ALTER TABLE "FavoriteRoad" ADD COLUMN     "roadId" TEXT;

-- AlterTable
ALTER TABLE "FavoriteWaypoint" ADD COLUMN     "wayPointsId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteRoad_roadId_key" ON "FavoriteRoad"("roadId");

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteWaypoint_wayPointsId_key" ON "FavoriteWaypoint"("wayPointsId");

-- CreateIndex
CREATE UNIQUE INDEX "WayPoints_favoriteWaypointId_key" ON "WayPoints"("favoriteWaypointId");

-- AddForeignKey
ALTER TABLE "FavoriteRoad" ADD CONSTRAINT "FavoriteRoad_roadId_fkey" FOREIGN KEY ("roadId") REFERENCES "Road"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteWaypoint" ADD CONSTRAINT "FavoriteWaypoint_wayPointsId_fkey" FOREIGN KEY ("wayPointsId") REFERENCES "WayPoints"("id") ON DELETE SET NULL ON UPDATE CASCADE;
