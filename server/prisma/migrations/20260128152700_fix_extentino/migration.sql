/*
  Warnings:

  - The values [Extention] on the enum `DemandType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "DemandType_new" AS ENUM ('New', 'Extension');
ALTER TABLE "Demand" ALTER COLUMN "type" TYPE "DemandType_new" USING ("type"::text::"DemandType_new");
ALTER TYPE "DemandType" RENAME TO "DemandType_old";
ALTER TYPE "DemandType_new" RENAME TO "DemandType";
DROP TYPE "DemandType_old";
COMMIT;
