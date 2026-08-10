/*
  Warnings:

  - A unique constraint covering the columns `[resetToken]` on the table `Tokens` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Tokens_resetToken_key" ON "Tokens"("resetToken");
