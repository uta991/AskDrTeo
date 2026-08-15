-- AlterTable
ALTER TABLE "media_assets" ADD COLUMN     "failureReason" TEXT,
ADD COLUMN     "lastProviderEventAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "media_provider_events" (
    "id" TEXT NOT NULL,
    "assetId" TEXT,
    "provider" "StorageProvider" NOT NULL,
    "externalId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_provider_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "media_provider_events_assetId_createdAt_idx" ON "media_provider_events"("assetId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "media_provider_events_provider_externalId_key" ON "media_provider_events"("provider", "externalId");

-- AddForeignKey
ALTER TABLE "media_provider_events" ADD CONSTRAINT "media_provider_events_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "media_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

