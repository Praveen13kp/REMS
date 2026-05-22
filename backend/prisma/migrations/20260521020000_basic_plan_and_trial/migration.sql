-- Rename the free tier from FREE → BASIC, and add a 7-day trial window
-- that locks the tenant out once it expires.

-- Map all existing FREE/FREE_TRIAL rows onto BASIC. Other plans untouched.
UPDATE "Company"
   SET "subscriptionPlan" = 'BASIC'
 WHERE "subscriptionPlan" IS NULL
    OR "subscriptionPlan" IN ('FREE', 'FREE_TRIAL');

-- Default for new companies created without an explicit plan.
ALTER TABLE "Company" ALTER COLUMN "subscriptionPlan" SET DEFAULT 'BASIC';

-- Trial-end timestamp. Existing companies (which were created before this
-- feature existed) get a fresh 7-day window from now so they don't
-- insta-lock — gives ops + dev time to convert them or move them to a paid
-- plan manually.
ALTER TABLE "Company" ADD COLUMN "trialEndsAt" TIMESTAMP(3);

UPDATE "Company"
   SET "trialEndsAt" = NOW() + INTERVAL '7 days'
 WHERE "subscriptionPlan" = 'BASIC';
