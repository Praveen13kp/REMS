DROP INDEX IF EXISTS "User_email_key";

CREATE UNIQUE INDEX IF NOT EXISTS "User_companyId_email_key" ON "User"("companyId", "email");

CREATE UNIQUE INDEX IF NOT EXISTS "user_superadmin_email_uq" ON "User"("email") WHERE "companyId" IS NULL;
