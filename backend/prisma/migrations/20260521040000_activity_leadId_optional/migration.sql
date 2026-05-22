-- Allow tenant-wide audit entries (user invited / suspended / billing
-- changes etc) to live in the Activity table by making leadId optional.
-- Existing lead-tied rows are unaffected.

ALTER TABLE "Activity" DROP CONSTRAINT IF EXISTS "Activity_leadId_fkey";
ALTER TABLE "Activity" ALTER COLUMN "leadId" DROP NOT NULL;
ALTER TABLE "Activity"
  ADD CONSTRAINT "Activity_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Activity_companyId_createdAt_idx"
  ON "Activity"("companyId", "createdAt");
