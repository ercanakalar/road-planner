/*
  Warnings:

  - You are about to drop the column `order` on the `FavoriteWaypoint` table. All the data in the column will be lost.
  - You are about to drop the column `favoriteWaypointId` on the `WayPoints` table. All the data in the column will be lost.
  - Added the required column `description` to the `FavoriteWaypoint` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `FavoriteWaypoint` table without a default value. This is not possible if the table is not empty.
  - Made the column `latitude` on table `FavoriteWaypoint` required. This step will fail if there are existing NULL values in that column.
  - Made the column `longitude` on table `FavoriteWaypoint` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "WayPoints" DROP CONSTRAINT "WayPoints_favoriteWaypointId_fkey";

-- AlterTable
ALTER TABLE "FavoriteWaypoint" DROP COLUMN "order",
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL,
ALTER COLUMN "latitude" SET NOT NULL,
ALTER COLUMN "longitude" SET NOT NULL;

-- AlterTable
ALTER TABLE "WayPoints" DROP COLUMN "favoriteWaypointId";
