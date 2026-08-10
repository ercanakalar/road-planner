-- DropForeignKey
ALTER TABLE "FavoriteWaypoint" DROP CONSTRAINT "FavoriteWaypoint_favoriteRoadId_fkey";

-- AlterTable
ALTER TABLE "FavoriteWaypoint" ADD COLUMN     "roadId" TEXT;

-- AddForeignKey
ALTER TABLE "FavoriteWaypoint" ADD CONSTRAINT "FavoriteWaypoint_favoriteRoadId_fkey" FOREIGN KEY ("favoriteRoadId") REFERENCES "FavoriteRoad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteWaypoint" ADD CONSTRAINT "FavoriteWaypoint_roadId_fkey" FOREIGN KEY ("roadId") REFERENCES "Road"("id") ON DELETE SET NULL ON UPDATE CASCADE;
