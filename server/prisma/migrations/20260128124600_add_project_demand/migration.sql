-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('Emergency', 'Semiannual');

-- CreateEnum
CREATE TYPE "ProjectKind" AS ENUM ('App', 'Track');

-- CreateEnum
CREATE TYPE "Median" AS ENUM ('H1', 'H2');

-- CreateEnum
CREATE TYPE "DemandType" AS ENUM ('New', 'Extention');

-- CreateEnum
CREATE TYPE "DemandStatus" AS ENUM ('Pending', 'Approved', 'Rejected', 'PartiallyApproved');

-- CreateTable
CREATE TABLE "Project" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "type" "ProjectType" NOT NULL,
    "kind" "ProjectKind" NOT NULL,
    "locationId" INTEGER NOT NULL,
    "year" INTEGER,
    "median" "Median",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Demand" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "serviceName" TEXT NOT NULL,
    "resourceName" TEXT NOT NULL,
    "resourceService" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "locationId" INTEGER NOT NULL,
    "type" "DemandType" NOT NULL,
    "status" "DemandStatus" NOT NULL DEFAULT 'Pending',
    "clusterName" TEXT,
    "approvedValue" DOUBLE PRECISION,
    "approvedDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Demand_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Demand" ADD CONSTRAINT "Demand_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Demand" ADD CONSTRAINT "Demand_serviceName_fkey" FOREIGN KEY ("serviceName") REFERENCES "Service"("name") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Demand" ADD CONSTRAINT "Demand_resourceName_resourceService_fkey" FOREIGN KEY ("resourceName", "resourceService") REFERENCES "Resource"("name", "serviceName") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Demand" ADD CONSTRAINT "Demand_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
