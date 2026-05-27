-- Add project linkage + share-link fields to File
ALTER TABLE "File" ADD COLUMN "projectId" TEXT;
ALTER TABLE "File" ADD COLUMN "shareToken" TEXT;
ALTER TABLE "File" ADD COLUMN "shareExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "File_shareToken_key" ON "File"("shareToken");
CREATE INDEX "File_projectId_idx" ON "File"("projectId");

ALTER TABLE "File"
  ADD CONSTRAINT "File_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
