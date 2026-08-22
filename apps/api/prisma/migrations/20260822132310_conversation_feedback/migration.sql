-- CreateTable
CREATE TABLE "conversation_feedback" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "parentId" TEXT,
    "operatorId" TEXT,
    "token" TEXT NOT NULL,
    "rating" INTEGER,
    "comment" TEXT,
    "ratedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "conversation_feedback_conversationId_key" ON "conversation_feedback"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_feedback_token_key" ON "conversation_feedback"("token");

-- CreateIndex
CREATE INDEX "conversation_feedback_operatorId_rating_idx" ON "conversation_feedback"("operatorId", "rating");

-- AddForeignKey
ALTER TABLE "conversation_feedback" ADD CONSTRAINT "conversation_feedback_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_feedback" ADD CONSTRAINT "conversation_feedback_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_feedback" ADD CONSTRAINT "conversation_feedback_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
