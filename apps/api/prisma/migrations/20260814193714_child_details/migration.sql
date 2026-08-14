-- AlterTable
ALTER TABLE "children" ADD COLUMN     "fatherBirthDate" TIMESTAMP(3),
ADD COLUMN     "gestationalWeek" INTEGER,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "motherBirthDate" TIMESTAMP(3);
