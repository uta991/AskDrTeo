-- CreateEnum
CREATE TYPE "MilestoneDomain" AS ENUM ('GROSS_MOTOR', 'FINE_MOTOR', 'SOCIAL_EMOTIONAL', 'COGNITIVE_LANGUAGE');

-- CreateEnum
CREATE TYPE "MilestoneAnswer" AS ENUM ('YES', 'SOMETIMES', 'NOT_YET', 'UNKNOWN');

-- CreateTable
CREATE TABLE "milestone_questions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "ageMonths" INTEGER NOT NULL,
    "domain" "MilestoneDomain" NOT NULL,
    "questionKa" TEXT NOT NULL,
    "redFlag" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "milestone_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestone_assessments" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "ageMonths" INTEGER NOT NULL,
    "summary" JSONB NOT NULL,
    "hasRedFlag" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "milestone_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestone_answers" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" "MilestoneAnswer" NOT NULL,

    CONSTRAINT "milestone_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "milestone_questions_code_key" ON "milestone_questions"("code");

-- CreateIndex
CREATE INDEX "milestone_questions_ageMonths_domain_sortOrder_idx" ON "milestone_questions"("ageMonths", "domain", "sortOrder");

-- CreateIndex
CREATE INDEX "milestone_assessments_childId_createdAt_idx" ON "milestone_assessments"("childId", "createdAt");

-- CreateIndex
CREATE INDEX "milestone_answers_questionId_idx" ON "milestone_answers"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "milestone_answers_assessmentId_questionId_key" ON "milestone_answers"("assessmentId", "questionId");

-- AddForeignKey
ALTER TABLE "milestone_assessments" ADD CONSTRAINT "milestone_assessments_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestone_answers" ADD CONSTRAINT "milestone_answers_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "milestone_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestone_answers" ADD CONSTRAINT "milestone_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "milestone_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
