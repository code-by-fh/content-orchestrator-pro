-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('XING', 'LINKEDIN', 'MEDIUM');

-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('PENDING', 'PUBLISHED', 'ERROR');

-- CreateTable
CREATE TABLE "Publication" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "status" "PublicationStatus" NOT NULL DEFAULT 'PENDING',
    "platformId" TEXT,
    "errorMessage" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Publication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Publication_articleId_platform_key" ON "Publication"("articleId", "platform");

-- AddForeignKey
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
