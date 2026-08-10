/*
  Warnings:

  - A unique constraint covering the columns `[userId,roadId]` on the table `FavoriteRoad` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "FavoriteRoad_userId_roadId_key" ON "FavoriteRoad"("userId", "roadId");

-- AddForeignKey
ALTER TABLE "FavoriteRoad" ADD CONSTRAINT "FavoriteRoad_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
