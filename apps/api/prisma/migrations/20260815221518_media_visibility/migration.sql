-- CreateEnum
CREATE TYPE "MediaVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- AlterTable
ALTER TABLE "media_assets" ADD COLUMN     "visibility" "MediaVisibility" NOT NULL DEFAULT 'PRIVATE';

