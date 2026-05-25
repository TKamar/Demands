-- AddColumn
ALTER TABLE "Demand" ADD COLUMN "requirementGroupId" INTEGER;

-- AddColumn
ALTER TABLE "Demand" ADD COLUMN "prerequisiteDemandId" INTEGER;

-- AddColumn
ALTER TABLE "Demand" ADD COLUMN "isInternalTicket" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "Demand" ADD CONSTRAINT "Demand_prerequisiteDemandId_fkey"
  FOREIGN KEY ("prerequisiteDemandId") REFERENCES "Demand"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterEnum
-- Note: enum alteration cannot run in a transaction in PostgreSQL < 12
ALTER TYPE "DemandStatus" ADD VALUE IF NOT EXISTS 'WaitingOnPrerequisite';
