/*
  Warnings:

  - You are about to drop the column `roadId` on the `FavoriteRoad` table. All the data in the column will be lost.
  - You are about to drop the column `wayPointsId` on the `FavoriteWaypoint` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "FavoriteRoad" DROP CONSTRAINT "FavoriteRoad_roadId_fkey";

-- DropForeignKey
ALTER TABLE "FavoriteWaypoint" DROP CONSTRAINT "FavoriteWaypoint_wayPointsId_fkey";

-- DropIndex
DROP INDEX "FavoriteRoad_roadId_key";

-- DropIndex
DROP INDEX "FavoriteWaypoint_wayPointsId_key";

-- DropIndex
DROP INDEX "WayPoints_favoriteWaypointId_key";

-- AlterTable
ALTER TABLE "FavoriteRoad" DROP COLUMN "roadId";

-- AlterTable
ALTER TABLE "FavoriteWaypoint" DROP COLUMN "wayPointsId";

-- AddForeignKey
ALTER TABLE "Road" ADD CONSTRAINT "Road_favoriteRoadId_fkey" FOREIGN KEY ("favoriteRoadId") REFERENCES "FavoriteRoad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WayPoints" ADD CONSTRAINT "WayPoints_favoriteWaypointId_fkey" FOREIGN KEY ("favoriteWaypointId") REFERENCES "FavoriteWaypoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;
