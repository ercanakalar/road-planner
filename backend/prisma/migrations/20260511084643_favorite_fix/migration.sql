/*
  Warnings:

  - A unique constraint covering the columns `[roadId]` on the table `FavoriteRoad` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "FavoriteRoad" ADD COLUMN     "roadId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteRoad_roadId_key" ON "FavoriteRoad"("roadId");

-- AddForeignKey
ALTER TABLE "FavoriteRoad" ADD CONSTRAINT "FavoriteRoad_roadId_fkey" FOREIGN KEY ("roadId") REFERENCES "Road"("id") ON DELETE SET NULL ON UPDATE CASCADE;
