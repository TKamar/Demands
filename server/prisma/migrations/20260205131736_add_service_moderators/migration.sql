-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "moderators" TEXT[] DEFAULT ARRAY[]::TEXT[];
