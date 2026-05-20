-- Restore globally-unique User.email constraint.
--
-- Reversal of 20260516000001_multi_tenant_email: each email may belong to
-- exactly one User row, regardless of company. If the same person works at
-- two tenants, they must register a different email for each.
--
-- PREREQUISITE: run `node backend/scripts/detect-duplicate-emails.cjs` and
-- resolve every cross-tenant duplicate before applying this migration —
-- otherwise the unique index creation will fail.

DROP INDEX IF EXISTS "User_companyId_email_key";
DROP INDEX IF EXISTS "user_superadmin_email_uq";

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
