-- AlterTable
ALTER TABLE "FavoriteWaypoint" ADD COLUMN     "userId" TEXT;

-- AddForeignKey
ALTER TABLE "FavoriteWaypoint" ADD CONSTRAINT "FavoriteWaypoint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
