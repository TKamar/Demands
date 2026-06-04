-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('NewDemand', 'DemandDecision', 'DemandCancelled', 'DemandEdited', 'NewProject', 'ProjectDeleted', 'ProjectEdited');

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "type" "NotificationType" NOT NULL,
    "recipientUsername" TEXT,
    "isAdminBroadcast" BOOLEAN NOT NULL DEFAULT false,
    "readByUsernames" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "demandId" INTEGER,
    "projectName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_recipientUsername_createdAt_idx" ON "Notification"("recipientUsername", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Notification_isAdminBroadcast_createdAt_idx" ON "Notification"("isAdminBroadcast", "createdAt" DESC);
