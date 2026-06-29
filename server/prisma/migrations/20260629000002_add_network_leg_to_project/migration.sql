-- CreateEnum
CREATE TYPE "NetworkLeg" AS ENUM ('Leg1', 'Leg2');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN "networkLeg" "NetworkLeg";
