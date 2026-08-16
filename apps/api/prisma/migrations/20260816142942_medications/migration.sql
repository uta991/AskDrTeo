-- CreateEnum
CREATE TYPE "MedicationDosingType" AS ENUM ('PER_KG', 'BY_AGE');

-- CreateTable
CREATE TABLE "medications" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "dosingType" "MedicationDosingType" NOT NULL DEFAULT 'PER_KG',
    "mgPerKgMin" DOUBLE PRECISION,
    "mgPerKgMax" DOUBLE PRECISION,
    "ageBands" JSONB,
    "intervalHoursMin" INTEGER NOT NULL,
    "intervalHoursMax" INTEGER NOT NULL,
    "maxDailyMg" DOUBLE PRECISION NOT NULL,
    "minAgeMonths" INTEGER NOT NULL DEFAULT 0,
    "minWeightKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "concentrations" JSONB NOT NULL DEFAULT '[]',
    "note" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "medications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "medications_slug_key" ON "medications"("slug");

-- CreateIndex
CREATE INDEX "medications_isActive_sortOrder_idx" ON "medications"("isActive", "sortOrder");
