-- AlterEnum
ALTER TYPE "DemandStatus" ADD VALUE 'AwaitingProcurement';
ALTER TYPE "DemandStatus" ADD VALUE 'HeldForEfficiency';
ALTER TYPE "DemandStatus" ADD VALUE 'ConditionalFootprintReduction';
ALTER TYPE "DemandStatus" ADD VALUE 'InProgress';
ALTER TYPE "DemandStatus" ADD VALUE 'TransferredTo810';

-- AlterTable
ALTER TABLE "Demand" ADD COLUMN "assignedToUser" TEXT,
ADD COLUMN "procurementDate" TIMESTAMP(3);
