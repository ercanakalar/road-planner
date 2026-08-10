/*
  Warnings:

  - Added the required column `confirmPassword` to the `ManuelAuth` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ManuelAuth" ADD COLUMN     "confirmPassword" TEXT NOT NULL;
