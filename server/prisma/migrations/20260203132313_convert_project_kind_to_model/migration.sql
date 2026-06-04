-- Convert column: cast enum to text and rename
ALTER TABLE "Project" ALTER COLUMN "kind" TYPE TEXT USING "kind"::TEXT;
ALTER TABLE "Project" RENAME COLUMN "kind" TO "kindName";

-- DropEnum (must happen before creating table with same name)
DROP TYPE "ProjectKind";

-- CreateTable
CREATE TABLE "ProjectKind" (
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectKind_pkey" PRIMARY KEY ("name")
);

-- Seed initial values from existing enum
INSERT INTO "ProjectKind" ("name", "updatedAt") VALUES ('App', NOW()), ('Track', NOW());

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_kindName_fkey" FOREIGN KEY ("kindName") REFERENCES "ProjectKind"("name") ON DELETE RESTRICT ON UPDATE CASCADE;
