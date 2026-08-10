-- AlterTable
ALTER TABLE "FavoriteWaypoint" ADD COLUMN     "favoriteRoadId" TEXT;

-- AddForeignKey
ALTER TABLE "FavoriteWaypoint" ADD CONSTRAINT "FavoriteWaypoint_favoriteRoadId_fkey" FOREIGN KEY ("favoriteRoadId") REFERENCES "FavoriteRoad"("id") ON DELETE SET NULL ON UPDATE CASCADE;
