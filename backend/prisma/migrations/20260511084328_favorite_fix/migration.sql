/*
  Warnings:

  - You are about to drop the column `isFavorite` on the `Road` table. All the data in the column will be lost.
  - You are about to drop the column `isFavorite` on the `WayPoints` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Road" DROP COLUMN "isFavorite";

-- AlterTable
ALTER TABLE "WayPoints" DROP COLUMN "isFavorite";
