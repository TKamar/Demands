-- AlterTable
ALTER TABLE "Demand" ADD COLUMN     "decisionReasonName" TEXT;

-- CreateTable
CREATE TABLE "DecisionReason" (
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DecisionReason_pkey" PRIMARY KEY ("name")
);

-- AddForeignKey
ALTER TABLE "Demand" ADD CONSTRAINT "Demand_decisionReasonName_fkey" FOREIGN KEY ("decisionReasonName") REFERENCES "DecisionReason"("name") ON DELETE SET NULL ON UPDATE CASCADE;
