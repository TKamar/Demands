-- CreateTable
CREATE TABLE "UserCenterManagement" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "centerName" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserCenterManagement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserCenterManagement_username_centerName_key" ON "UserCenterManagement"("username", "centerName");

-- CreateIndex
CREATE INDEX "UserCenterManagement_username_idx" ON "UserCenterManagement"("username");

-- AddForeignKey
ALTER TABLE "UserCenterManagement" ADD CONSTRAINT "UserCenterManagement_username_fkey" FOREIGN KEY ("username") REFERENCES "User"("username") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCenterManagement" ADD CONSTRAINT "UserCenterManagement_centerName_fkey" FOREIGN KEY ("centerName") REFERENCES "Center"("name") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing data: copy User.centerName into the join table for all CENTER_MANAGER users
INSERT INTO "UserCenterManagement" ("username", "centerName")
SELECT "username", "centerName" FROM "User"
WHERE "role" = 'CENTER_MANAGER' AND "centerName" IS NOT NULL;
