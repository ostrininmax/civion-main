-- AlterTable
ALTER TABLE "ProcessInstance" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "completedSteps" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "currentStep" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "submittedAt" TIMESTAMP(3);
