-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'PLATFORM_ADMIN';

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "status" TEXT DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "PlatformAudit" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlatformAudit_createdAt_idx" ON "PlatformAudit"("createdAt");

-- AddForeignKey
ALTER TABLE "PlatformAudit" ADD CONSTRAINT "PlatformAudit_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformAudit" ADD CONSTRAINT "PlatformAudit_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
