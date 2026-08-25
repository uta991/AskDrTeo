-- CreateEnum
CREATE TYPE "ParentRole" AS ENUM ('MOTHER', 'FATHER', 'GUARDIAN', 'UNSPECIFIED');

-- AlterTable
ALTER TABLE "children" ADD COLUMN     "parentRole" "ParentRole" NOT NULL DEFAULT 'UNSPECIFIED';
