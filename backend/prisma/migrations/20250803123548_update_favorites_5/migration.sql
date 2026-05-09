/*
  Warnings:

  - You are about to drop the column `roadId` on the `FavoriteRoad` table. All the data in the column will be lost.
  - You are about to drop the column `favoriteRoadId` on the `FavoriteWaypoint` table. All the data in the column will be lost.
  - You are about to drop the column `waypointId` on the `FavoriteWaypoint` table. All the data in the column will be lost.
  - You are about to drop the column `favoriteRoadId` on the `Road` table. All the data in the column will be lost.
  - You are about to drop the column `favoriteWaypointId` on the `WayPoints` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "FavoriteWaypoint" DROP CONSTRAINT "FavoriteWaypoint_favoriteRoadId_fkey";

-- DropForeignKey
ALTER TABLE "Road" DROP CONSTRAINT "Road_favoriteRoadId_fkey";

-- DropForeignKey
ALTER TABLE "WayPoints" DROP CONSTRAINT "WayPoints_favoriteWaypointId_fkey";

-- DropIndex
DROP INDEX "FavoriteRoad_roadId_key";

-- DropIndex
DROP INDEX "FavoriteWaypoint_waypointId_key";

-- DropIndex
DROP INDEX "Road_favoriteRoadId_key";

-- DropIndex
DROP INDEX "WayPoints_favoriteWaypointId_key";

-- AlterTable
ALTER TABLE "FavoriteRoad" DROP COLUMN "roadId";

-- AlterTable
ALTER TABLE "FavoriteWaypoint" DROP COLUMN "favoriteRoadId",
DROP COLUMN "waypointId";

-- AlterTable
ALTER TABLE "Road" DROP COLUMN "favoriteRoadId";

-- AlterTable
ALTER TABLE "WayPoints" DROP COLUMN "favoriteWaypointId";
