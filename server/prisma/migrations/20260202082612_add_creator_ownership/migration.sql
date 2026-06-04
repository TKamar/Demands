-- AlterTable
ALTER TABLE "Demand" ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "createdByName" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "createdByName" TEXT;

-- CreateIndex
CREATE INDEX "Demand_createdBy_idx" ON "Demand"("createdBy");

-- CreateIndex
CREATE INDEX "Project_createdBy_idx" ON "Project"("createdBy");
