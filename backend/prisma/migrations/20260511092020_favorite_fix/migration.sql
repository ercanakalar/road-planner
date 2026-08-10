/*
  Warnings:

  - You are about to drop the column `favoriteWaypointId` on the `FavoriteWaypoint` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[waypointId]` on the table `FavoriteWaypoint` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "FavoriteWaypoint" DROP CONSTRAINT "FavoriteWaypoint_favoriteWaypointId_fkey";

-- DropIndex
DROP INDEX "FavoriteWaypoint_favoriteWaypointId_key";

-- AlterTable
ALTER TABLE "FavoriteWaypoint" DROP COLUMN "favoriteWaypointId",
ADD COLUMN     "waypointId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteWaypoint_waypointId_key" ON "FavoriteWaypoint"("waypointId");

-- AddForeignKey
ALTER TABLE "FavoriteWaypoint" ADD CONSTRAINT "FavoriteWaypoint_waypointId_fkey" FOREIGN KEY ("waypointId") REFERENCES "WayPoints"("id") ON DELETE SET NULL ON UPDATE CASCADE;
