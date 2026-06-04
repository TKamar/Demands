-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "emergencyOptionName" TEXT;

-- CreateTable
CREATE TABLE "Wallet" (
    "id" SERIAL NOT NULL,
    "centerName" TEXT NOT NULL,
    "capacityId" INTEGER NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyOption" (
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmergencyOption_pkey" PRIMARY KEY ("name")
);

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_centerName_capacityId_key" ON "Wallet"("centerName", "capacityId");

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_centerName_fkey" FOREIGN KEY ("centerName") REFERENCES "Center"("name") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_capacityId_fkey" FOREIGN KEY ("capacityId") REFERENCES "Capacity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_emergencyOptionName_fkey" FOREIGN KEY ("emergencyOptionName") REFERENCES "EmergencyOption"("name") ON DELETE SET NULL ON UPDATE CASCADE;
