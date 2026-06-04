-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('P1', 'P2', 'P3');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "branchName" TEXT,
ADD COLUMN     "centerName" TEXT,
ADD COLUMN     "priority" "Priority",
ADD COLUMN     "sectionName" TEXT;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_sectionName_branchName_centerName_fkey" FOREIGN KEY ("sectionName", "branchName", "centerName") REFERENCES "Section"("name", "branchName", "branchCenter") ON DELETE SET NULL ON UPDATE CASCADE;
