-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO', 'FILE');

-- CreateEnum
CREATE TYPE "MediaSource" AS ENUM ('ADMIN', 'CHAT', 'PROFILE', 'OTHER');

-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('UPLOADING', 'PROCESSING', 'READY', 'FAILED', 'DELETED');

-- AlterTable
ALTER TABLE "messages" DROP COLUMN "attachmentMeta",
DROP COLUMN "attachmentUrl";

-- AlterTable
ALTER TABLE "videos" DROP COLUMN "durationSec",
DROP COLUMN "playbackId",
DROP COLUMN "provider",
DROP COLUMN "providerAssetId",
DROP COLUMN "thumbnailUrl",
ADD COLUMN     "mediaAssetId" TEXT,
ADD COLUMN     "thumbnailAssetId" TEXT;

-- CreateTable
CREATE TABLE "media_assets" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT,
    "type" "MediaType" NOT NULL,
    "source" "MediaSource" NOT NULL DEFAULT 'OTHER',
    "status" "MediaStatus" NOT NULL DEFAULT 'READY',
    "provider" "StorageProvider" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "playbackId" TEXT,
    "publicUrl" TEXT,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_attachments" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "media_assets_ownerId_source_idx" ON "media_assets"("ownerId", "source");

-- CreateIndex
CREATE INDEX "media_assets_status_deletedAt_idx" ON "media_assets"("status", "deletedAt");

-- CreateIndex
CREATE INDEX "message_attachments_assetId_idx" ON "message_attachments"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "message_attachments_messageId_assetId_key" ON "message_attachments"("messageId", "assetId");

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "videos" ADD CONSTRAINT "videos_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "videos" ADD CONSTRAINT "videos_thumbnailAssetId_fkey" FOREIGN KEY ("thumbnailAssetId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "media_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

