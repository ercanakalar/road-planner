/*
  Warnings:

  - You are about to drop the column `favoriteAddressInfoId` on the `FavoriteWaypoint` table. All the data in the column will be lost.
  - You are about to drop the column `favoriteRoadId` on the `FavoriteWaypoint` table. All the data in the column will be lost.
  - You are about to drop the column `roadId` on the `FavoriteWaypoint` table. All the data in the column will be lost.
  - You are about to drop the `FavoriteAddressInfo` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `userId` on table `FavoriteRoad` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "FavoriteRoad" DROP CONSTRAINT "FavoriteRoad_userId_fkey";

-- DropForeignKey
ALTER TABLE "FavoriteWaypoint" DROP CONSTRAINT "FavoriteWaypoint_favoriteAddressInfoId_fkey";

-- DropForeignKey
ALTER TABLE "FavoriteWaypoint" DROP CONSTRAINT "FavoriteWaypoint_favoriteRoadId_fkey";

-- DropForeignKey
ALTER TABLE "FavoriteWaypoint" DROP CONSTRAINT "FavoriteWaypoint_roadId_fkey";

-- DropForeignKey
ALTER TABLE "FavoriteWaypoint" DROP CONSTRAINT "FavoriteWaypoint_userId_fkey";

-- DropForeignKey
ALTER TABLE "FavoriteWaypoint" DROP CONSTRAINT "FavoriteWaypoint_waypointId_fkey";

-- DropForeignKey
ALTER TABLE "GoogleAuth" DROP CONSTRAINT "GoogleAuth_userId_fkey";

-- DropForeignKey
ALTER TABLE "Tokens" DROP CONSTRAINT "Tokens_userId_fkey";

-- DropForeignKey
ALTER TABLE "WayPoints" DROP CONSTRAINT "WayPoints_addressInfoId_fkey";

-- DropIndex
DROP INDEX "FavoriteWaypoint_userId_waypointId_key";

-- AlterTable
ALTER TABLE "FavoriteRoad" ALTER COLUMN "userId" SET NOT NULL;

-- AlterTable
ALTER TABLE "FavoriteWaypoint" DROP COLUMN "favoriteAddressInfoId",
DROP COLUMN "favoriteRoadId",
DROP COLUMN "roadId",
ALTER COLUMN "latitude" DROP NOT NULL,
ALTER COLUMN "longitude" DROP NOT NULL,
ALTER COLUMN "order" DROP NOT NULL,
ALTER COLUMN "waypointId" DROP NOT NULL;

-- DropTable
DROP TABLE "FavoriteAddressInfo";

-- CreateIndex
CREATE INDEX "WayPoints_roadId_order_idx" ON "WayPoints"("roadId", "order");

-- AddForeignKey
ALTER TABLE "GoogleAuth" ADD CONSTRAINT "GoogleAuth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tokens" ADD CONSTRAINT "Tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WayPoints" ADD CONSTRAINT "WayPoints_addressInfoId_fkey" FOREIGN KEY ("addressInfoId") REFERENCES "AddressInfo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteRoad" ADD CONSTRAINT "FavoriteRoad_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteWaypoint" ADD CONSTRAINT "FavoriteWaypoint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteWaypoint" ADD CONSTRAINT "FavoriteWaypoint_waypointId_fkey" FOREIGN KEY ("waypointId") REFERENCES "WayPoints"("id") ON DELETE SET NULL ON UPDATE CASCADE;
