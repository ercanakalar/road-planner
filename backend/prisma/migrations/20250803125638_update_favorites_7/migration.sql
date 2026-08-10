-- DropForeignKey
ALTER TABLE "FavoriteWaypoint" DROP CONSTRAINT "FavoriteWaypoint_waypointId_fkey";

-- DropIndex
DROP INDEX "FavoriteRoad_roadId_key";

-- DropIndex
DROP INDEX "FavoriteWaypoint_waypointId_key";

-- AlterTable
ALTER TABLE "WayPoints" ADD COLUMN     "favoriteWaypointId" TEXT;

-- AddForeignKey
ALTER TABLE "WayPoints" ADD CONSTRAINT "WayPoints_favoriteWaypointId_fkey" FOREIGN KEY ("favoriteWaypointId") REFERENCES "FavoriteWaypoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;
