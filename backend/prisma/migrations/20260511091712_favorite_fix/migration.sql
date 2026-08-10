/*
  Warnings:

  - A unique constraint covering the columns `[favoriteWaypointId]` on the table `FavoriteWaypoint` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "FavoriteWaypoint" ADD COLUMN     "favoriteWaypointId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteWaypoint_favoriteWaypointId_key" ON "FavoriteWaypoint"("favoriteWaypointId");

-- AddForeignKey
ALTER TABLE "FavoriteWaypoint" ADD CONSTRAINT "FavoriteWaypoint_favoriteWaypointId_fkey" FOREIGN KEY ("favoriteWaypointId") REFERENCES "WayPoints"("id") ON DELETE SET NULL ON UPDATE CASCADE;
