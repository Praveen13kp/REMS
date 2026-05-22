-- Normalise Company.subscriptionPlan onto the three live codes used by the
-- pricing page: FREE, PRO, ENTERPRISE. Old marketing names get folded in:
--   FREE_TRIAL    -> FREE
--   STARTER       -> PRO   (legacy mid-tier collapses into the new PRO)
--   PROFESSIONAL  -> PRO

UPDATE "Company"
   SET "subscriptionPlan" = CASE
     WHEN "subscriptionPlan" IS NULL OR "subscriptionPlan" = 'FREE_TRIAL' THEN 'FREE'
     WHEN "subscriptionPlan" IN ('STARTER', 'PROFESSIONAL') THEN 'PRO'
     WHEN "subscriptionPlan" IN ('FREE', 'PRO', 'ENTERPRISE') THEN "subscriptionPlan"
     ELSE 'FREE'
   END;

ALTER TABLE "Company" ALTER COLUMN "subscriptionPlan" SET DEFAULT 'FREE';
