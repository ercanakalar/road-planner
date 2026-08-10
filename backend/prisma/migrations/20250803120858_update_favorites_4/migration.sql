/*
  Warnings:

  - A unique constraint covering the columns `[roadId]` on the table `FavoriteRoad` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[waypointId]` on the table `FavoriteWaypoint` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[favoriteRoadId]` on the table `Road` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[favoriteWaypointId]` on the table `WayPoints` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "FavoriteRoad" ADD COLUMN     "roadId" TEXT;

-- AlterTable
ALTER TABLE "FavoriteWaypoint" ADD COLUMN     "waypointId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteRoad_roadId_key" ON "FavoriteRoad"("roadId");

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteWaypoint_waypointId_key" ON "FavoriteWaypoint"("waypointId");

-- CreateIndex
CREATE UNIQUE INDEX "Road_favoriteRoadId_key" ON "Road"("favoriteRoadId");

-- CreateIndex
CREATE UNIQUE INDEX "WayPoints_favoriteWaypointId_key" ON "WayPoints"("favoriteWaypointId");
