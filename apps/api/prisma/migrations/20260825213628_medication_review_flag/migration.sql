-- AlterTable
ALTER TABLE "medications" ADD COLUMN     "addedByDoctorId" TEXT,
ADD COLUMN     "needsReview" BOOLEAN NOT NULL DEFAULT false;
