/*
  Warnings:

  - A unique constraint covering the columns `[waypointId]` on the table `FavoriteWaypoint` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "FavoriteWaypoint" DROP CONSTRAINT "FavoriteWaypoint_waypointId_fkey";

-- DropIndex
DROP INDEX "FavoriteWaypoint_userId_waypointId_key";

-- AlterTable
ALTER TABLE "WayPoints" ADD COLUMN     "favoriteWaypointId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteWaypoint_waypointId_key" ON "FavoriteWaypoint"("waypointId");

-- AddForeignKey
ALTER TABLE "WayPoints" ADD CONSTRAINT "WayPoints_favoriteWaypointId_fkey" FOREIGN KEY ("favoriteWaypointId") REFERENCES "FavoriteWaypoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteWaypoint" ADD CONSTRAINT "FavoriteWaypoint_waypointId_fkey" FOREIGN KEY ("waypointId") REFERENCES "Road"("id") ON DELETE SET NULL ON UPDATE CASCADE;
