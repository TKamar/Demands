-- Add ProjectStatus enum
CREATE TYPE "ProjectStatus" AS ENUM ('Active', 'PendingAdminReview', 'FullyApproved');

-- Add projectStatus column to Project
ALTER TABLE "Project" ADD COLUMN "projectStatus" "ProjectStatus" NOT NULL DEFAULT 'Active';

-- Extend NotificationType enum with new value
ALTER TYPE "NotificationType" ADD VALUE 'ProjectNeedsAdminReview';

-- DemandHistoryLog table
CREATE TABLE "DemandHistoryLog" (
    "id" SERIAL NOT NULL,
    "demandId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "actorUsername" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DemandHistoryLog_pkey" PRIMARY KEY ("id")
);

-- Index for demandId lookups
CREATE INDEX "DemandHistoryLog_demandId_idx" ON "DemandHistoryLog"("demandId");

-- Foreign key to Demand
ALTER TABLE "DemandHistoryLog" ADD CONSTRAINT "DemandHistoryLog_demandId_fkey"
    FOREIGN KEY ("demandId") REFERENCES "Demand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
