-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_sectionName_branchName_centerName_fkey";

-- AlterTable: Add columns as nullable first for Demand
ALTER TABLE "Demand" ADD COLUMN "branchName" TEXT,
ADD COLUMN "centerName" TEXT,
ADD COLUMN "sectionName" TEXT;

-- Update existing Demand rows with values from their related Project
UPDATE "Demand" d
SET
  "centerName" = p."centerName",
  "branchName" = p."branchName",
  "sectionName" = p."sectionName"
FROM "Project" p
WHERE d."projectName" = p."name";

-- Now make the columns NOT NULL
ALTER TABLE "Demand" ALTER COLUMN "branchName" SET NOT NULL,
ALTER COLUMN "centerName" SET NOT NULL,
ALTER COLUMN "sectionName" SET NOT NULL;

-- AlterTable: Make Project columns NOT NULL
ALTER TABLE "Project" ALTER COLUMN "branchName" SET NOT NULL,
ALTER COLUMN "centerName" SET NOT NULL,
ALTER COLUMN "sectionName" SET NOT NULL;

-- AddForeignKey for Project
ALTER TABLE "Project" ADD CONSTRAINT "Project_centerName_fkey" FOREIGN KEY ("centerName") REFERENCES "Center"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Project" ADD CONSTRAINT "Project_branchName_centerName_fkey" FOREIGN KEY ("branchName", "centerName") REFERENCES "Branch"("name", "centerName") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Project" ADD CONSTRAINT "Project_sectionName_branchName_centerName_fkey" FOREIGN KEY ("sectionName", "branchName", "centerName") REFERENCES "Section"("name", "branchName", "branchCenter") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey for Demand
ALTER TABLE "Demand" ADD CONSTRAINT "Demand_centerName_fkey" FOREIGN KEY ("centerName") REFERENCES "Center"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Demand" ADD CONSTRAINT "Demand_branchName_centerName_fkey" FOREIGN KEY ("branchName", "centerName") REFERENCES "Branch"("name", "centerName") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Demand" ADD CONSTRAINT "Demand_sectionName_branchName_centerName_fkey" FOREIGN KEY ("sectionName", "branchName", "centerName") REFERENCES "Section"("name", "branchName", "branchCenter") ON DELETE RESTRICT ON UPDATE CASCADE;
