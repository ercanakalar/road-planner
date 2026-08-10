/*
  Warnings:

  - You are about to drop the column `roadId` on the `FavoriteRoad` table. All the data in the column will be lost.
  - You are about to drop the column `favoriteRoadId` on the `FavoriteWaypoint` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId]` on the table `FavoriteRoad` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "FavoriteRoad" DROP CONSTRAINT "FavoriteRoad_roadId_fkey";

-- DropForeignKey
ALTER TABLE "FavoriteWaypoint" DROP CONSTRAINT "FavoriteWaypoint_favoriteRoadId_fkey";

-- DropIndex
DROP INDEX "FavoriteRoad_roadId_key";

-- DropIndex
DROP INDEX "FavoriteRoad_userId_roadId_key";

-- DropIndex
DROP INDEX "WayPoints_roadId_order_idx";

-- AlterTable
ALTER TABLE "FavoriteRoad" DROP COLUMN "roadId";

-- AlterTable
ALTER TABLE "FavoriteWaypoint" DROP COLUMN "favoriteRoadId";

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteRoad_userId_key" ON "FavoriteRoad"("userId");

-- CreateIndex
CREATE INDEX "WayPoints_order_idx" ON "WayPoints"("order");
