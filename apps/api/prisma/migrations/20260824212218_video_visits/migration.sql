-- CreateEnum
CREATE TYPE "VideoVisitStatus" AS ENUM ('REQUESTED', 'SCHEDULED', 'LIVE', 'DONE', 'CANCELED', 'NO_SHOW');

-- CreateTable
CREATE TABLE "video_visits" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "childId" TEXT,
    "requestedDate" TIMESTAMP(3) NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "status" "VideoVisitStatus" NOT NULL DEFAULT 'REQUESTED',
    "reason" TEXT,
    "roomName" TEXT NOT NULL,
    "staffId" TEXT,
    "parentJoinedAt" TIMESTAMP(3),
    "staffJoinedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "staffNote" TEXT,
    "conversationId" TEXT,
    "paymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "video_visits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "video_visits_roomName_key" ON "video_visits"("roomName");

-- CreateIndex
CREATE UNIQUE INDEX "video_visits_conversationId_key" ON "video_visits"("conversationId");

-- CreateIndex
CREATE INDEX "video_visits_requestedDate_status_idx" ON "video_visits"("requestedDate", "status");

-- CreateIndex
CREATE INDEX "video_visits_parentId_createdAt_idx" ON "video_visits"("parentId", "createdAt");

-- CreateIndex
CREATE INDEX "video_visits_scheduledAt_idx" ON "video_visits"("scheduledAt");

-- AddForeignKey
ALTER TABLE "video_visits" ADD CONSTRAINT "video_visits_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_visits" ADD CONSTRAINT "video_visits_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_visits" ADD CONSTRAINT "video_visits_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_visits" ADD CONSTRAINT "video_visits_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
