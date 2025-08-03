-- AlterTable
ALTER TABLE "Road" ADD COLUMN     "favoriteRoadId" TEXT;

-- AlterTable
ALTER TABLE "WayPoints" ADD COLUMN     "favoriteWaypointId" TEXT;

-- AddForeignKey
ALTER TABLE "Road" ADD CONSTRAINT "Road_favoriteRoadId_fkey" FOREIGN KEY ("favoriteRoadId") REFERENCES "FavoriteRoad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WayPoints" ADD CONSTRAINT "WayPoints_favoriteWaypointId_fkey" FOREIGN KEY ("favoriteWaypointId") REFERENCES "FavoriteWaypoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;
