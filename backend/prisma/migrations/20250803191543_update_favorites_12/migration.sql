/*
  Warnings:

  - A unique constraint covering the columns `[userId,waypointId]` on the table `FavoriteWaypoint` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "FavoriteWaypoint_userId_waypointId_key" ON "FavoriteWaypoint"("userId", "waypointId");
