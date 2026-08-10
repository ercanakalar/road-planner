/*
  Warnings:

  - You are about to drop the column `roadId` on the `FavoriteRoad` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `FavoriteWaypoint` table. All the data in the column will be lost.
  - You are about to drop the column `wayPointsId` on the `FavoriteWaypoint` table. All the data in the column will be lost.
  - Added the required column `description` to the `FavoriteRoad` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `FavoriteRoad` table without a default value. This is not possible if the table is not empty.
  - Added the required column `latitude` to the `FavoriteWaypoint` table without a default value. This is not possible if the table is not empty.
  - Added the required column `longitude` to the `FavoriteWaypoint` table without a default value. This is not possible if the table is not empty.
  - Added the required column `order` to the `FavoriteWaypoint` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "FavoriteRoad" DROP CONSTRAINT "FavoriteRoad_roadId_fkey";

-- DropForeignKey
ALTER TABLE "FavoriteWaypoint" DROP CONSTRAINT "FavoriteWaypoint_wayPointsId_fkey";

-- DropIndex
DROP INDEX "FavoriteRoad_roadId_key";

-- DropIndex
DROP INDEX "FavoriteWaypoint_wayPointsId_key";

-- AlterTable
ALTER TABLE "FavoriteRoad" DROP COLUMN "roadId",
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "FavoriteWaypoint" DROP COLUMN "userId",
DROP COLUMN "wayPointsId",
ADD COLUMN     "favoriteAddressInfoId" TEXT,
ADD COLUMN     "favoriteRoadId" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "longitude" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "order" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "FavoriteAddressInfo" (
    "id" TEXT NOT NULL,
    "country" TEXT,
    "province" TEXT,
    "district" TEXT,
    "address" TEXT NOT NULL,

    CONSTRAINT "FavoriteAddressInfo_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FavoriteRoad" ADD CONSTRAINT "FavoriteRoad_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteWaypoint" ADD CONSTRAINT "FavoriteWaypoint_favoriteRoadId_fkey" FOREIGN KEY ("favoriteRoadId") REFERENCES "FavoriteRoad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteWaypoint" ADD CONSTRAINT "FavoriteWaypoint_favoriteAddressInfoId_fkey" FOREIGN KEY ("favoriteAddressInfoId") REFERENCES "FavoriteAddressInfo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
