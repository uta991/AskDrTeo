-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'DECLINED', 'CANCELED', 'DONE');

-- CreateTable
CREATE TABLE "growth_entries" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL,
    "weightKg" DECIMAL(5,2),
    "heightCm" DECIMAL(5,1),
    "headCm" DECIMAL(4,1),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "growth_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vaccines" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ageMonths" INTEGER NOT NULL,
    "doseNumber" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "vaccines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "child_vaccinations" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "vaccineId" TEXT NOT NULL,
    "doneAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "child_vaccinations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "childId" TEXT,
    "preferredAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'REQUESTED',
    "scheduledAt" TIMESTAMP(3),
    "staffNote" TEXT,
    "usedFreeVisit" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "growth_entries_childId_measuredAt_idx" ON "growth_entries"("childId", "measuredAt");

-- CreateIndex
CREATE UNIQUE INDEX "vaccines_code_key" ON "vaccines"("code");

-- CreateIndex
CREATE INDEX "vaccines_ageMonths_sortOrder_idx" ON "vaccines"("ageMonths", "sortOrder");

-- CreateIndex
CREATE INDEX "child_vaccinations_childId_idx" ON "child_vaccinations"("childId");

-- CreateIndex
CREATE UNIQUE INDEX "child_vaccinations_childId_vaccineId_key" ON "child_vaccinations"("childId", "vaccineId");

-- CreateIndex
CREATE INDEX "appointments_parentId_createdAt_idx" ON "appointments"("parentId", "createdAt");

-- CreateIndex
CREATE INDEX "appointments_status_preferredAt_idx" ON "appointments"("status", "preferredAt");

-- AddForeignKey
ALTER TABLE "growth_entries" ADD CONSTRAINT "growth_entries_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_vaccinations" ADD CONSTRAINT "child_vaccinations_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_vaccinations" ADD CONSTRAINT "child_vaccinations_vaccineId_fkey" FOREIGN KEY ("vaccineId") REFERENCES "vaccines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE SET NULL ON UPDATE CASCADE;
