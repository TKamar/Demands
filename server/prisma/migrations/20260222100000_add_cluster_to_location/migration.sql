-- CreateTable
CREATE TABLE "Cluster" (
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cluster_pkey" PRIMARY KEY ("name")
);

-- Add clusterName column to Location (nullable first for existing rows)
ALTER TABLE "Location" ADD COLUMN "clusterName" TEXT;

-- Insert default cluster for existing locations
INSERT INTO "Cluster" ("name", "displayName", "isActive", "createdAt", "updatedAt")
VALUES ('default', 'Default Cluster', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;

-- Update existing locations to use default cluster
UPDATE "Location" SET "clusterName" = 'default' WHERE "clusterName" IS NULL;

-- Make clusterName required
ALTER TABLE "Location" ALTER COLUMN "clusterName" SET NOT NULL;

-- Drop the old unique constraint
ALTER TABLE "Location" DROP CONSTRAINT IF EXISTS "Location_baseName_environmentName_networkName_key";

-- Create new unique constraint including clusterName
ALTER TABLE "Location" ADD CONSTRAINT "Location_baseName_environmentName_networkName_clusterName_key" UNIQUE ("baseName", "environmentName", "networkName", "clusterName");

-- Add foreign key constraint
ALTER TABLE "Location" ADD CONSTRAINT "Location_clusterName_fkey" FOREIGN KEY ("clusterName") REFERENCES "Cluster"("name") ON DELETE CASCADE ON UPDATE CASCADE;
