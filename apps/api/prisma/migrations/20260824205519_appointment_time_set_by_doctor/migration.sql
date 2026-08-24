-- DropIndex
DROP INDEX "appointments_status_preferredAt_idx";

-- AlterTable
ALTER TABLE "appointments" ALTER COLUMN "preferredAt" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "appointments_status_createdAt_idx" ON "appointments"("status", "createdAt");
