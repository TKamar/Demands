-- CreateTable (repair: previous migration had wrong DDL)
CREATE TABLE IF NOT EXISTS "CloudResourceStatus" (
    "id" SERIAL NOT NULL,
    "baseName" TEXT NOT NULL,
    "networkName" TEXT NOT NULL,
    "clusterName" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
    "updatedBy" TEXT,
    CONSTRAINT "CloudResourceStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CloudResourceStatus_baseName_networkName_clusterName_service_key"
    ON "CloudResourceStatus"("baseName", "networkName", "clusterName", "service");

-- AddForeignKey (only if not already present)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CloudResourceStatus_baseName_fkey'
  ) THEN
    ALTER TABLE "CloudResourceStatus" ADD CONSTRAINT "CloudResourceStatus_baseName_fkey"
      FOREIGN KEY ("baseName") REFERENCES "Base"("name") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CloudResourceStatus_networkName_fkey'
  ) THEN
    ALTER TABLE "CloudResourceStatus" ADD CONSTRAINT "CloudResourceStatus_networkName_fkey"
      FOREIGN KEY ("networkName") REFERENCES "Network"("name") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CloudResourceStatus_clusterName_fkey'
  ) THEN
    ALTER TABLE "CloudResourceStatus" ADD CONSTRAINT "CloudResourceStatus_clusterName_fkey"
      FOREIGN KEY ("clusterName") REFERENCES "Cluster"("name") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
