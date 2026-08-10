/*
  Warnings:

  - You are about to drop the column `waypointId` on the `FavoriteWaypoint` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "FavoriteWaypoint" DROP CONSTRAINT "FavoriteWaypoint_waypointId_fkey";

-- DropIndex
DROP INDEX "FavoriteWaypoint_waypointId_key";

-- AlterTable
ALTER TABLE "FavoriteWaypoint" DROP COLUMN "waypointId";
