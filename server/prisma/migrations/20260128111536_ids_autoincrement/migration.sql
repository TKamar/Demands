/*
  Warnings:

  - The primary key for the `Capacity` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `Capacity` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `Location` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `Location` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `locationId` on the `Capacity` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "Capacity" DROP CONSTRAINT "Capacity_locationId_fkey";

-- AlterTable
ALTER TABLE "Capacity" DROP CONSTRAINT "Capacity_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "locationId",
ADD COLUMN     "locationId" INTEGER NOT NULL,
ADD CONSTRAINT "Capacity_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Location" DROP CONSTRAINT "Location_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "Location_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "Capacity_locationId_resourceName_resourceService_key" ON "Capacity"("locationId", "resourceName", "resourceService");

-- AddForeignKey
ALTER TABLE "Capacity" ADD CONSTRAINT "Capacity_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
