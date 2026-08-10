-- DropForeignKey
ALTER TABLE "ManuelAuth" DROP CONSTRAINT "ManuelAuth_userId_fkey";

-- AlterTable
ALTER TABLE "ManuelAuth" ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "ManuelAuth" ADD CONSTRAINT "ManuelAuth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
