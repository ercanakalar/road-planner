/*
  Warnings:

  - You are about to drop the column `confirmPassword` on the `ManuelAuth` table. All the data in the column will be lost.
  - You are about to drop the `WayPoints` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `updatedAt` to the `AddressInfo` table without a default value. This is not possible if the table is not empty.
  - Made the column `userId` on table `ManuelAuth` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `updatedAt` to the `Permission` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Permit` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "FavoriteRoad" DROP CONSTRAINT "FavoriteRoad_userId_fkey";

-- DropForeignKey
ALTER TABLE "FavoriteWaypoint" DROP CONSTRAINT "FavoriteWaypoint_userId_fkey";

-- DropForeignKey
ALTER TABLE "FavoriteWaypoint" DROP CONSTRAINT "FavoriteWaypoint_waypointId_fkey";

-- DropForeignKey
ALTER TABLE "GoogleAuth" DROP CONSTRAINT "GoogleAuth_userId_fkey";

-- DropForeignKey
ALTER TABLE "ManuelAuth" DROP CONSTRAINT "ManuelAuth_userId_fkey";

-- DropForeignKey
ALTER TABLE "Tokens" DROP CONSTRAINT "Tokens_userId_fkey";

-- DropForeignKey
ALTER TABLE "WayPoints" DROP CONSTRAINT "WayPoints_addressInfoId_fkey";

-- DropForeignKey
ALTER TABLE "WayPoints" DROP CONSTRAINT "WayPoints_roadId_fkey";

-- AlterTable
ALTER TABLE "AddressInfo" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "FavoriteRoad" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "FavoriteWaypoint" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "GoogleAuth" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ManuelAuth" DROP COLUMN "confirmPassword",
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "userId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Permission" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Permit" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Road" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Tokens" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- DropTable
DROP TABLE "WayPoints";

-- CreateTable
CREATE TABLE "WayPoint" (
    "id" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "order" INTEGER NOT NULL,
    "addressInfoId" TEXT,
    "roadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "WayPoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WayPoint_roadId_order_idx" ON "WayPoint"("roadId", "order");

-- CreateIndex
CREATE INDEX "WayPoint_deletedAt_idx" ON "WayPoint"("deletedAt");

-- CreateIndex
CREATE INDEX "AddressInfo_country_province_district_idx" ON "AddressInfo"("country", "province", "district");

-- CreateIndex
CREATE INDEX "FavoriteRoad_userId_idx" ON "FavoriteRoad"("userId");

-- CreateIndex
CREATE INDEX "FavoriteWaypoint_userId_idx" ON "FavoriteWaypoint"("userId");

-- CreateIndex
CREATE INDEX "Road_userId_idx" ON "Road"("userId");

-- CreateIndex
CREATE INDEX "Road_deletedAt_idx" ON "Road"("deletedAt");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- AddForeignKey
ALTER TABLE "ManuelAuth" ADD CONSTRAINT "ManuelAuth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleAuth" ADD CONSTRAINT "GoogleAuth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tokens" ADD CONSTRAINT "Tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WayPoint" ADD CONSTRAINT "WayPoint_addressInfoId_fkey" FOREIGN KEY ("addressInfoId") REFERENCES "AddressInfo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WayPoint" ADD CONSTRAINT "WayPoint_roadId_fkey" FOREIGN KEY ("roadId") REFERENCES "Road"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteRoad" ADD CONSTRAINT "FavoriteRoad_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteWaypoint" ADD CONSTRAINT "FavoriteWaypoint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteWaypoint" ADD CONSTRAINT "FavoriteWaypoint_waypointId_fkey" FOREIGN KEY ("waypointId") REFERENCES "WayPoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;
