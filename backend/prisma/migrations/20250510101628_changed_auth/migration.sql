/*
  Warnings:

  - You are about to drop the column `tokensId` on the `GoogleAuth` table. All the data in the column will be lost.
  - You are about to drop the column `confirmPassword` on the `ManuelAuth` table. All the data in the column will be lost.
  - You are about to drop the column `tokensId` on the `ManuelAuth` table. All the data in the column will be lost.
  - You are about to drop the column `googleAuthId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `manuelAuthId` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[email]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `Tokens` table without a default value. This is not possible if the table is not empty.
  - Added the required column `email` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "GoogleAuth" DROP CONSTRAINT "GoogleAuth_tokensId_fkey";

-- DropForeignKey
ALTER TABLE "ManuelAuth" DROP CONSTRAINT "ManuelAuth_tokensId_fkey";

-- DropIndex
DROP INDEX "GoogleAuth_tokensId_key";

-- DropIndex
DROP INDEX "ManuelAuth_tokensId_key";

-- AlterTable
ALTER TABLE "GoogleAuth" DROP COLUMN "tokensId";

-- AlterTable
ALTER TABLE "ManuelAuth" DROP COLUMN "confirmPassword",
DROP COLUMN "tokensId";

-- AlterTable
ALTER TABLE "Tokens" ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "googleAuthId",
DROP COLUMN "manuelAuthId",
ADD COLUMN     "email" TEXT NOT NULL,
ALTER COLUMN "firstName" DROP NOT NULL,
ALTER COLUMN "lastName" DROP NOT NULL,
ALTER COLUMN "nickName" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Tokens" ADD CONSTRAINT "Tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
