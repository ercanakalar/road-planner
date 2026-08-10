/*
  Warnings:

  - You are about to alter the column `password` on the `ManuelAuth` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `confirmPassword` on the `ManuelAuth` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to drop the column `userId` on the `Tokens` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Tokens" DROP CONSTRAINT "Tokens_userId_fkey";

-- AlterTable
ALTER TABLE "ManuelAuth" ALTER COLUMN "password" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "confirmPassword" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "Tokens" DROP COLUMN "userId";

-- AddForeignKey
ALTER TABLE "Tokens" ADD CONSTRAINT "Tokens_id_fkey" FOREIGN KEY ("id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
