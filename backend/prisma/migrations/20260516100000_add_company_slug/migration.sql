ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "slug" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Company_slug_key" ON "Company"("slug");
