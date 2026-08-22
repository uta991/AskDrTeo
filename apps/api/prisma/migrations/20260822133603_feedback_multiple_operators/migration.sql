-- CreateTable
CREATE TABLE "conversation_feedback_operators" (
    "id" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_feedback_operators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conversation_feedback_operators_operatorId_idx" ON "conversation_feedback_operators"("operatorId");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_feedback_operators_feedbackId_operatorId_key" ON "conversation_feedback_operators"("feedbackId", "operatorId");

-- AddForeignKey
ALTER TABLE "conversation_feedback_operators" ADD CONSTRAINT "conversation_feedback_operators_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "conversation_feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_feedback_operators" ADD CONSTRAINT "conversation_feedback_operators_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
