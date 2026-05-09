/*
  Warnings:

  - A unique constraint covering the columns `[tokenId]` on the table `GoogleAuth` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tokenId]` on the table `ManuelAuth` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "GoogleAuth" ADD COLUMN     "tokenId" TEXT;

-- AlterTable
ALTER TABLE "ManuelAuth" ADD COLUMN     "tokenId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "GoogleAuth_tokenId_key" ON "GoogleAuth"("tokenId");

-- CreateIndex
CREATE UNIQUE INDEX "ManuelAuth_tokenId_key" ON "ManuelAuth"("tokenId");

-- AddForeignKey
ALTER TABLE "ManuelAuth" ADD CONSTRAINT "ManuelAuth_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "Tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleAuth" ADD CONSTRAINT "GoogleAuth_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "Tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;
