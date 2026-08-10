/*
  Warnings:

  - Added the required column `latitude` to the `FavoriteWaypoint` table without a default value. This is not possible if the table is not empty.
  - Added the required column `longitude` to the `FavoriteWaypoint` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "FavoriteRoad" DROP CONSTRAINT "FavoriteRoad_roadId_fkey";

-- DropForeignKey
ALTER TABLE "FavoriteWaypoint" DROP CONSTRAINT "FavoriteWaypoint_waypointId_fkey";

-- DropIndex
DROP INDEX "FavoriteRoad_roadId_idx";

-- DropIndex
DROP INDEX "FavoriteWaypoint_waypointId_idx";

-- DropIndex
DROP INDEX "Road_userId_idx";

-- DropIndex
DROP INDEX "WayPoints_roadId_idx";

-- AlterTable
ALTER TABLE "FavoriteRoad" ADD COLUMN     "description" TEXT,
ADD COLUMN     "title" TEXT,
ALTER COLUMN "roadId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "FavoriteWaypoint" ADD COLUMN     "description" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "longitude" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "title" TEXT,
ALTER COLUMN "waypointId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "FavoriteRoad" ADD CONSTRAINT "FavoriteRoad_roadId_fkey" FOREIGN KEY ("roadId") REFERENCES "Road"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteWaypoint" ADD CONSTRAINT "FavoriteWaypoint_waypointId_fkey" FOREIGN KEY ("waypointId") REFERENCES "WayPoints"("id") ON DELETE SET NULL ON UPDATE CASCADE;
