-- Basic is no longer permanently free. New price: ₹499/mo, ₹399/mo billed annually.
-- Prices are stored in paise. Razorpay plan IDs intentionally cleared so the
-- SuperAdmin Plans UI re-creates them on the next save (or the Razorpay plan
-- record can be created lazily when the first user upgrades).
UPDATE "Plan"
SET
  "priceMonthly" = 49900,
  "priceAnnual"  = 39900,
  "tagline"      = 'Entry tier — every essential to start working leads',
  "razorpayPlanIdMonthly" = NULL,
  "razorpayPlanIdAnnual"  = NULL
WHERE "code" = 'BASIC';
