-- Soft-delete column for Lead. When set, the lead is in the 30-day
-- recovery window and hidden from default listings. A background job
-- purges rows older than 30 days.
ALTER TABLE "Lead" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Listings filter by (companyId, deletedAt) all the time; the partial
-- index keeps the hot path on active leads cheap without bloating the
-- index for the rarely-read deleted rows.
CREATE INDEX "Lead_companyId_deletedAt_idx" ON "Lead"("companyId", "deletedAt");
