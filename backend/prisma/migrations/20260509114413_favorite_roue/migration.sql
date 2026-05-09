/*
  Warnings:

  - You are about to drop the column `roadId` on the `FavoriteRoad` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId]` on the table `FavoriteRoad` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "FavoriteRoad" DROP CONSTRAINT "FavoriteRoad_roadId_fkey";

-- DropIndex
DROP INDEX "FavoriteRoad_userId_roadId_key";

-- AlterTable
ALTER TABLE "FavoriteRoad" DROP COLUMN "roadId";

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteRoad_userId_key" ON "FavoriteRoad"("userId");
