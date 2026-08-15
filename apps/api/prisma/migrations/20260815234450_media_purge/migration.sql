-- AlterTable
ALTER TABLE "media_assets" ADD COLUMN     "purgeAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "purgeLastError" TEXT,
ADD COLUMN     "purgeNextRetryAt" TIMESTAMP(3),
ADD COLUMN     "purgedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "media_assets_deletedAt_purgedAt_purgeNextRetryAt_idx" ON "media_assets"("deletedAt", "purgedAt", "purgeNextRetryAt");

