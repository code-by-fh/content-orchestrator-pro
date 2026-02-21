/*
  Warnings:

  - You are about to drop the column `publishedAt` on the `Article` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Article` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[articleId,platform,language]` on the table `Publication` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "Language" AS ENUM ('DE', 'EN');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Platform" ADD VALUE 'RSS';
ALTER TYPE "Platform" ADD VALUE 'WEBHOOK';

-- DropIndex
DROP INDEX "Publication_articleId_platform_key";

-- AlterTable
ALTER TABLE "Article" DROP COLUMN "publishedAt",
DROP COLUMN "status",
ADD COLUMN     "linkedinTeaserEn" TEXT,
ADD COLUMN     "markdownContentEn" TEXT,
ADD COLUMN     "processingStatus" "ProcessingStatus" NOT NULL DEFAULT 'PROCESSING',
ADD COLUMN     "seoDescriptionEn" TEXT,
ADD COLUMN     "seoTitleEn" TEXT,
ADD COLUMN     "titleEn" TEXT,
ADD COLUMN     "xingSummaryEn" TEXT;

-- AlterTable
ALTER TABLE "Publication" ADD COLUMN     "language" "Language" NOT NULL DEFAULT 'DE';

-- DropEnum
DROP TYPE "ArticleStatus";

-- CreateIndex
CREATE UNIQUE INDEX "Publication_articleId_platform_language_key" ON "Publication"("articleId", "platform", "language");
