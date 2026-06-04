/*
  Warnings:

  - You are about to drop the column `projectId` on the `Demand` table. All the data in the column will be lost.
  - The primary key for the `Project` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Project` table. All the data in the column will be lost.
  - Added the required column `projectName` to the `Demand` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Demand" DROP CONSTRAINT "Demand_projectId_fkey";

-- AlterTable
ALTER TABLE "Demand" DROP COLUMN "projectId",
ADD COLUMN     "projectName" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Project" DROP CONSTRAINT "Project_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "Project_pkey" PRIMARY KEY ("name");

-- AddForeignKey
ALTER TABLE "Demand" ADD CONSTRAINT "Demand_projectName_fkey" FOREIGN KEY ("projectName") REFERENCES "Project"("name") ON DELETE CASCADE ON UPDATE CASCADE;
