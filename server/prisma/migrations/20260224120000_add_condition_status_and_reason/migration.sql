-- Add ApprovedWithCondition to DemandStatus enum
ALTER TYPE "DemandStatus" ADD VALUE 'ApprovedWithCondition';

-- Drop foreign key constraint from Demand to DecisionReason
ALTER TABLE "Demand" DROP CONSTRAINT IF EXISTS "Demand_decisionReasonName_fkey";

-- Rename decisionReasonName column to reason
ALTER TABLE "Demand" RENAME COLUMN "decisionReasonName" TO "reason";

-- Drop DecisionReason table
DROP TABLE IF EXISTS "DecisionReason";
