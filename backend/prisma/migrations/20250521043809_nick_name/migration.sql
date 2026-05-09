/*
  Warnings:

  - A unique constraint covering the columns `[nickName]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "Road" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Road_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WayPoints" (
    "id" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "order" INTEGER NOT NULL,
    "roadId" TEXT,
    "addressInfoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WayPoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AddressInfo" (
    "id" TEXT NOT NULL,
    "country" TEXT,
    "province" TEXT,
    "district" TEXT,
    "address" TEXT NOT NULL,

    CONSTRAINT "AddressInfo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_nickName_key" ON "User"("nickName");

-- AddForeignKey
ALTER TABLE "Road" ADD CONSTRAINT "Road_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WayPoints" ADD CONSTRAINT "WayPoints_roadId_fkey" FOREIGN KEY ("roadId") REFERENCES "Road"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WayPoints" ADD CONSTRAINT "WayPoints_addressInfoId_fkey" FOREIGN KEY ("addressInfoId") REFERENCES "AddressInfo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
