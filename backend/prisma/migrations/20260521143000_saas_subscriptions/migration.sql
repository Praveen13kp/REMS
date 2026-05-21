-- SaaS subscription fields for tenant companies.
ALTER TABLE "Company"
  ADD COLUMN IF NOT EXISTS "subscriptionStatus" TEXT DEFAULT 'TRIALING',
  ADD COLUMN IF NOT EXISTS "subscriptionStartDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "subscriptionEndDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "maxUsers" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "maxLeads" INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS "billingCycle" TEXT DEFAULT 'MONTHLY',
  ADD COLUMN IF NOT EXISTS "isTrialActive" BOOLEAN NOT NULL DEFAULT true;

UPDATE "Company"
SET
  "subscriptionPlan" = CASE
    WHEN "subscriptionPlan" IN ('PRO', 'PROFESSIONAL') THEN 'PRO'
    WHEN "subscriptionPlan" = 'ENTERPRISE' THEN 'ENTERPRISE'
    ELSE 'BASIC'
  END,
  "subscriptionStatus" = COALESCE("subscriptionStatus", 'TRIALING'),
  "subscriptionStartDate" = COALESCE("subscriptionStartDate", "createdAt"),
  "subscriptionEndDate" = COALESCE("subscriptionEndDate", "createdAt" + INTERVAL '1 month'),
  "maxUsers" = CASE
    WHEN "subscriptionPlan" IN ('PRO', 'PROFESSIONAL') THEN 25
    WHEN "subscriptionPlan" = 'ENTERPRISE' THEN -1
    ELSE 1
  END,
  "maxLeads" = CASE
    WHEN "subscriptionPlan" IN ('PRO', 'PROFESSIONAL', 'ENTERPRISE') THEN -1
    ELSE 50
  END,
  "billingCycle" = COALESCE("billingCycle", 'MONTHLY'),
  "isTrialActive" = COALESCE("isTrialActive", true);

CREATE TABLE IF NOT EXISTS "Subscription" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "plan" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "status" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3),
  "paymentProvider" TEXT,
  "transactionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Subscription_companyId_idx" ON "Subscription"("companyId");
CREATE INDEX IF NOT EXISTS "Subscription_status_idx" ON "Subscription"("status");
CREATE INDEX IF NOT EXISTS "Subscription_plan_idx" ON "Subscription"("plan");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'Subscription_companyId_fkey'
  ) THEN
    ALTER TABLE "Subscription"
      ADD CONSTRAINT "Subscription_companyId_fkey"
      FOREIGN KEY ("companyId") REFERENCES "Company"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
