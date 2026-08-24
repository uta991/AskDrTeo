-- CreateTable
CREATE TABLE "travel_checklists" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "checked" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "travel_checklists_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "travel_checklists_childId_key" ON "travel_checklists"("childId");

-- AddForeignKey
ALTER TABLE "travel_checklists" ADD CONSTRAINT "travel_checklists_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;
