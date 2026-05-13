-- Sprint 2 gaps: Lead.priority/possessionTimeline/nextFollowUpAt, User.dept/lastLoginAt
ALTER TABLE "Lead"
  ADD COLUMN "priority"           TEXT,
  ADD COLUMN "possessionTimeline" TEXT,
  ADD COLUMN "nextFollowUpAt"     TIMESTAMP(3);

ALTER TABLE "User"
  ADD COLUMN "dept"        TEXT,
  ADD COLUMN "lastLoginAt" TIMESTAMP(3);

CREATE INDEX "Lead_priority_idx"        ON "Lead"("priority");
CREATE INDEX "Lead_nextFollowUpAt_idx"  ON "Lead"("nextFollowUpAt");
CREATE INDEX "Lead_assignedToId_status_idx" ON "Lead"("assignedToId", "status");
