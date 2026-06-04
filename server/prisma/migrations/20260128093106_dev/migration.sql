-- CreateTable
CREATE TABLE "Center" (
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Center_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "Branch" (
    "name" TEXT NOT NULL,
    "centerName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("name","centerName")
);

-- CreateTable
CREATE TABLE "Section" (
    "name" TEXT NOT NULL,
    "branchName" TEXT NOT NULL,
    "branchCenter" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("name","branchName","branchCenter")
);

-- CreateTable
CREATE TABLE "Base" (
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Base_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "Environment" (
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Environment_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "Network" (
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Network_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "baseName" TEXT NOT NULL,
    "environmentName" TEXT NOT NULL,
    "networkName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "Resource" (
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("name","serviceName")
);

-- CreateTable
CREATE TABLE "Capacity" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "resourceName" TEXT NOT NULL,
    "resourceService" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Capacity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Location_baseName_environmentName_networkName_key" ON "Location"("baseName", "environmentName", "networkName");

-- CreateIndex
CREATE UNIQUE INDEX "Capacity_locationId_resourceName_resourceService_key" ON "Capacity"("locationId", "resourceName", "resourceService");

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_centerName_fkey" FOREIGN KEY ("centerName") REFERENCES "Center"("name") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_branchName_branchCenter_fkey" FOREIGN KEY ("branchName", "branchCenter") REFERENCES "Branch"("name", "centerName") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_baseName_fkey" FOREIGN KEY ("baseName") REFERENCES "Base"("name") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_environmentName_fkey" FOREIGN KEY ("environmentName") REFERENCES "Environment"("name") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_networkName_fkey" FOREIGN KEY ("networkName") REFERENCES "Network"("name") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_serviceName_fkey" FOREIGN KEY ("serviceName") REFERENCES "Service"("name") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Capacity" ADD CONSTRAINT "Capacity_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Capacity" ADD CONSTRAINT "Capacity_resourceName_resourceService_fkey" FOREIGN KEY ("resourceName", "resourceService") REFERENCES "Resource"("name", "serviceName") ON DELETE CASCADE ON UPDATE CASCADE;
