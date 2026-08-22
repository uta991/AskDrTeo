-- AlterTable
ALTER TABLE "child_vaccinations" ADD COLUMN     "reminderSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "children" ADD COLUMN     "vaccinationHistoryAt" TIMESTAMP(3);
