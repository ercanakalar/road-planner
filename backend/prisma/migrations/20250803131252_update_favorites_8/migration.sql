/*
  Warnings:

  - You are about to drop the column `favoriteWaypointId` on the `WayPoints` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,waypointId]` on the table `FavoriteWaypoint` will be added. If there are existing duplicate values, this will fail.
  - Made the column `userId` on table `FavoriteWaypoint` required. This step will fail if there are existing NULL values in that column.
  - Made the column `waypointId` on table `FavoriteWaypoint` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "WayPoints" DROP CONSTRAINT "WayPoints_favoriteWaypointId_fkey";

-- AlterTable
ALTER TABLE "FavoriteWaypoint" ALTER COLUMN "userId" SET NOT NULL,
ALTER COLUMN "waypointId" SET NOT NULL;

-- AlterTable
ALTER TABLE "WayPoints" DROP COLUMN "favoriteWaypointId";

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteWaypoint_userId_waypointId_key" ON "FavoriteWaypoint"("userId", "waypointId");

-- AddForeignKey
ALTER TABLE "FavoriteWaypoint" ADD CONSTRAINT "FavoriteWaypoint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteWaypoint" ADD CONSTRAINT "FavoriteWaypoint_waypointId_fkey" FOREIGN KEY ("waypointId") REFERENCES "WayPoints"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
