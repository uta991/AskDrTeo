-- AlterTable
ALTER TABLE "video_visits" ADD COLUMN     "concludedAt" TIMESTAMP(3),
ADD COLUMN     "conclusionSentAt" TIMESTAMP(3),
ADD COLUMN     "diagnosis" TEXT,
ADD COLUMN     "prescription" TEXT;
