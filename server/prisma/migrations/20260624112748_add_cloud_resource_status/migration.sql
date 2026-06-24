-- AlterEnum
ALTER TYPE "DemandStatus" ADD VALUE 'CenterManagerApproved';

-- DropIndex
DROP INDEX "Location_baseName_environmentName_networkName_key";
