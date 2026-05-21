-- Make PlatformAudit.actorId + targetId nullable so platform-wide audits
-- (super-admin login, failed sign-ins, system jobs) can be recorded without
-- a confirmed actor or company target. The previous NOT NULL + FK combo
-- caused those inserts to silently fail.

-- DropForeignKey
ALTER TABLE "PlatformAudit" DROP CONSTRAINT IF EXISTS "PlatformAudit_targetId_fkey";
ALTER TABLE "PlatformAudit" DROP CONSTRAINT IF EXISTS "PlatformAudit_actorId_fkey";

-- AlterColumn
ALTER TABLE "PlatformAudit" ALTER COLUMN "targetId" DROP NOT NULL;
ALTER TABLE "PlatformAudit" ALTER COLUMN "actorId"  DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "PlatformAudit"
  ADD CONSTRAINT "PlatformAudit_targetId_fkey"
  FOREIGN KEY ("targetId") REFERENCES "Company"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PlatformAudit"
  ADD CONSTRAINT "PlatformAudit_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
