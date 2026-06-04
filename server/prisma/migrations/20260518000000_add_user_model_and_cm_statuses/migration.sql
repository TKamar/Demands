-- AlterEnum
ALTER TYPE "DemandStatus" ADD VALUE 'PendingCenterManager';
ALTER TYPE "DemandStatus" ADD VALUE 'CenterManagerRejected';

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MODERATOR', 'CENTER_MANAGER', 'REGULAR_USER');

-- CreateTable
CREATE TABLE "User" (
    "username" TEXT NOT NULL,
    "fullName" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'REGULAR_USER',
    "centerName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("username")
);

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_centerName_fkey" FOREIGN KEY ("centerName") REFERENCES "Center"("name") ON DELETE SET NULL ON UPDATE CASCADE;
