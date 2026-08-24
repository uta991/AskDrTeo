-- AlterEnum
ALTER TYPE "PromoType" ADD VALUE 'FREE_VIDEO_VISIT';

-- CreateTable
CREATE TABLE "video_visit_credits" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "note" TEXT,
    "usedAt" TIMESTAMP(3),
    "visitId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_visit_credits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "video_visit_credits_visitId_key" ON "video_visit_credits"("visitId");

-- CreateIndex
CREATE INDEX "video_visit_credits_userId_usedAt_idx" ON "video_visit_credits"("userId", "usedAt");

-- AddForeignKey
ALTER TABLE "video_visit_credits" ADD CONSTRAINT "video_visit_credits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
