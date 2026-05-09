-- CreateTable
CREATE TABLE "FavoriteWaypoint" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wayPointsId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoriteWaypoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FavoriteRoad" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roadId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoriteRoad_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteWaypoint_wayPointsId_key" ON "FavoriteWaypoint"("wayPointsId");

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteRoad_roadId_key" ON "FavoriteRoad"("roadId");

-- AddForeignKey
ALTER TABLE "FavoriteWaypoint" ADD CONSTRAINT "FavoriteWaypoint_wayPointsId_fkey" FOREIGN KEY ("wayPointsId") REFERENCES "WayPoints"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteRoad" ADD CONSTRAINT "FavoriteRoad_roadId_fkey" FOREIGN KEY ("roadId") REFERENCES "Road"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
