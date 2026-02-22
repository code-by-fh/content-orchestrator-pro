/*
  Warnings:

  - The values [COMPLETED] on the enum `ProcessingStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');

-- AlterEnum
BEGIN;
CREATE TYPE "ProcessingStatus_new" AS ENUM ('PENDING', 'PROCESSING', 'DRAFT', 'FAILED');
ALTER TABLE "Article" ALTER COLUMN "processingStatus" DROP DEFAULT;
ALTER TABLE "Article" ALTER COLUMN "processingStatus" TYPE "ProcessingStatus_new" USING ("processingStatus"::text::"ProcessingStatus_new");
ALTER TYPE "ProcessingStatus" RENAME TO "ProcessingStatus_old";
ALTER TYPE "ProcessingStatus_new" RENAME TO "ProcessingStatus";
DROP TYPE "ProcessingStatus_old";
ALTER TABLE "Article" ALTER COLUMN "processingStatus" SET DEFAULT 'PROCESSING';
COMMIT;

-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "category" TEXT,
ADD COLUMN     "ogImageUrl" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'USER';
