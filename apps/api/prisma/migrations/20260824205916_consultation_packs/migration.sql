-- CreateTable
CREATE TABLE "consultation_packs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "chatLimit" INTEGER NOT NULL,
    "used" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "paymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultation_packs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "consultation_packs_userId_expiresAt_idx" ON "consultation_packs"("userId", "expiresAt");

-- AddForeignKey
ALTER TABLE "consultation_packs" ADD CONSTRAINT "consultation_packs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
