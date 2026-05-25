-- CreateTable
CREATE TABLE "FollowUp" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "outcome" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "completedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FollowUp_companyId_scheduledAt_idx" ON "FollowUp"("companyId", "scheduledAt");

-- CreateIndex
CREATE INDEX "FollowUp_leadId_scheduledAt_idx" ON "FollowUp"("leadId", "scheduledAt");

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: every Lead that currently has a nextFollowUpAt gets one pending FollowUp row.
INSERT INTO "FollowUp" ("id", "companyId", "leadId", "scheduledAt", "createdById", "createdAt", "updatedAt")
SELECT
    'fu_' || substr(md5(random()::text || clock_timestamp()::text), 1, 22),
    l."companyId",
    l."id",
    l."nextFollowUpAt",
    l."assignedToId",
    NOW(),
    NOW()
FROM "Lead" l
WHERE l."nextFollowUpAt" IS NOT NULL;
