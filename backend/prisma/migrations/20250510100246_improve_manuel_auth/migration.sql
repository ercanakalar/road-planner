/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `GoogleAuth` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId]` on the table `ManuelAuth` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `GoogleAuth` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `ManuelAuth` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "GoogleAuth" ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ManuelAuth" ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "googleAuthId" TEXT,
ADD COLUMN     "manuelAuthId" TEXT,
ALTER COLUMN "photo" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "GoogleAuth_userId_key" ON "GoogleAuth"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ManuelAuth_userId_key" ON "ManuelAuth"("userId");

-- AddForeignKey
ALTER TABLE "ManuelAuth" ADD CONSTRAINT "ManuelAuth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleAuth" ADD CONSTRAINT "GoogleAuth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
