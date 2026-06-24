-- CreateTable
CREATE TABLE "CloudResourceStatus" (
    "id" SERIAL NOT NULL,
    "baseName" TEXT NOT NULL,
    "networkName" TEXT NOT NULL,
    "clusterName" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    CONSTRAINT "CloudResourceStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CloudResourceStatus_baseName_networkName_clusterName_service_key" ON "CloudResourceStatus"("baseName", "networkName", "clusterName", "service");

-- AddForeignKey
ALTER TABLE "CloudResourceStatus" ADD CONSTRAINT "CloudResourceStatus_baseName_fkey" FOREIGN KEY ("baseName") REFERENCES "Base"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CloudResourceStatus" ADD CONSTRAINT "CloudResourceStatus_networkName_fkey" FOREIGN KEY ("networkName") REFERENCES "Network"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CloudResourceStatus" ADD CONSTRAINT "CloudResourceStatus_clusterName_fkey" FOREIGN KEY ("clusterName") REFERENCES "Cluster"("name") ON DELETE RESTRICT ON UPDATE CASCADE;
