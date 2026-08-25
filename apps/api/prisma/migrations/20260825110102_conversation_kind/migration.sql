-- CreateEnum
CREATE TYPE "ConversationKind" AS ENUM ('SUPPORT', 'VIDEO_VISIT');

-- DropIndex
DROP INDEX "conversations_status_lastMessageAt_idx";

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "kind" "ConversationKind" NOT NULL DEFAULT 'SUPPORT';

-- CreateIndex
CREATE INDEX "conversations_kind_status_lastMessageAt_idx" ON "conversations"("kind", "status", "lastMessageAt");
