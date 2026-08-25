-- AlterTable
ALTER TABLE "video_visits" ADD COLUMN     "visitHeightCm" DOUBLE PRECISION,
ADD COLUMN     "visitWeightKg" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "diagnosis_entries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "advice" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diagnosis_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnosis_medications" (
    "id" TEXT NOT NULL,
    "diagnosisId" TEXT NOT NULL,
    "medicationId" TEXT NOT NULL,
    "note" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "diagnosis_medications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "diagnosis_entries_name_key" ON "diagnosis_entries"("name");

-- CreateIndex
CREATE INDEX "diagnosis_entries_usageCount_idx" ON "diagnosis_entries"("usageCount");

-- CreateIndex
CREATE UNIQUE INDEX "diagnosis_medications_diagnosisId_medicationId_key" ON "diagnosis_medications"("diagnosisId", "medicationId");

-- AddForeignKey
ALTER TABLE "diagnosis_medications" ADD CONSTRAINT "diagnosis_medications_diagnosisId_fkey" FOREIGN KEY ("diagnosisId") REFERENCES "diagnosis_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnosis_medications" ADD CONSTRAINT "diagnosis_medications_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "medications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
