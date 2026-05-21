-- Track the plan a new company picked from the pricing page before paying.
-- Cleared after Razorpay confirms checkout and subscriptionPlan is bumped.
ALTER TABLE "Company" ADD COLUMN "pendingPlan" TEXT;
ALTER TABLE "Company" ADD COLUMN "pendingBillingCycle" TEXT;
