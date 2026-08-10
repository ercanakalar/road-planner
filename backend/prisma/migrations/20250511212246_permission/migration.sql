-- AlterTable
ALTER TABLE "User" ADD COLUMN     "permitId" TEXT;

-- CreateTable
CREATE TABLE "Permit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Permit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PermitPermissions" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PermitPermissions_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Permit_name_key" ON "Permit"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_name_key" ON "Permission"("name");

-- CreateIndex
CREATE INDEX "_PermitPermissions_B_index" ON "_PermitPermissions"("B");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_permitId_fkey" FOREIGN KEY ("permitId") REFERENCES "Permit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PermitPermissions" ADD CONSTRAINT "_PermitPermissions_A_fkey" FOREIGN KEY ("A") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PermitPermissions" ADD CONSTRAINT "_PermitPermissions_B_fkey" FOREIGN KEY ("B") REFERENCES "Permit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
