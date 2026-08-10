/*
  Warnings:

  - A unique constraint covering the columns `[roadId]` on the table `FavoriteRoad` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[waypointId]` on the table `FavoriteWaypoint` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "FavoriteRoad" ADD COLUMN     "roadId" TEXT;

-- AlterTable
ALTER TABLE "FavoriteWaypoint" ADD COLUMN     "waypointId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteRoad_roadId_key" ON "FavoriteRoad"("roadId");

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteWaypoint_waypointId_key" ON "FavoriteWaypoint"("waypointId");

-- AddForeignKey
ALTER TABLE "FavoriteRoad" ADD CONSTRAINT "FavoriteRoad_roadId_fkey" FOREIGN KEY ("roadId") REFERENCES "Road"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteWaypoint" ADD CONSTRAINT "FavoriteWaypoint_waypointId_fkey" FOREIGN KEY ("waypointId") REFERENCES "WayPoints"("id") ON DELETE SET NULL ON UPDATE CASCADE;
