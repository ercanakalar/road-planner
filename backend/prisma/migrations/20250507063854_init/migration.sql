-- CreateTable
CREATE TABLE "ManuelAuth" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "tokensId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManuelAuth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleAuth" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "googleToken" TEXT NOT NULL,
    "tokensId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoogleAuth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tokens" (
    "id" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "photo" TEXT NOT NULL,
    "nickName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ManuelAuth_email_key" ON "ManuelAuth"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ManuelAuth_tokensId_key" ON "ManuelAuth"("tokensId");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleAuth_email_key" ON "GoogleAuth"("email");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleAuth_tokensId_key" ON "GoogleAuth"("tokensId");

-- AddForeignKey
ALTER TABLE "ManuelAuth" ADD CONSTRAINT "ManuelAuth_tokensId_fkey" FOREIGN KEY ("tokensId") REFERENCES "Tokens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleAuth" ADD CONSTRAINT "GoogleAuth_tokensId_fkey" FOREIGN KEY ("tokensId") REFERENCES "Tokens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
