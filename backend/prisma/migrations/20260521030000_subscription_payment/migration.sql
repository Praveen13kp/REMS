-- Razorpay subscriptions + payment history.

CREATE TABLE "Subscription" (
  "id"                     TEXT NOT NULL,
  "companyId"              TEXT NOT NULL,
  "plan"                   TEXT NOT NULL,
  "billingCycle"           TEXT NOT NULL,
  "status"                 TEXT NOT NULL,
  "razorpayPlanId"         TEXT,
  "razorpaySubscriptionId" TEXT,
  "razorpayCustomerId"     TEXT,
  "amount"                 INTEGER NOT NULL,
  "currency"               TEXT NOT NULL DEFAULT 'INR',
  "currentPeriodStart"     TIMESTAMP(3),
  "currentPeriodEnd"       TIMESTAMP(3),
  "cancelledAt"            TIMESTAMP(3),
  "createdAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"              TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Subscription_razorpaySubscriptionId_key"
  ON "Subscription"("razorpaySubscriptionId");

CREATE INDEX "Subscription_companyId_status_idx"
  ON "Subscription"("companyId", "status");

CREATE INDEX "Subscription_razorpaySubscriptionId_idx"
  ON "Subscription"("razorpaySubscriptionId");

ALTER TABLE "Subscription"
  ADD CONSTRAINT "Subscription_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;


CREATE TABLE "Payment" (
  "id"                TEXT NOT NULL,
  "companyId"         TEXT NOT NULL,
  "subscriptionId"    TEXT,
  "razorpayPaymentId" TEXT NOT NULL,
  "razorpayOrderId"   TEXT,
  "razorpayInvoiceId" TEXT,
  "amount"            INTEGER NOT NULL,
  "currency"          TEXT NOT NULL DEFAULT 'INR',
  "status"            TEXT NOT NULL,
  "method"            TEXT,
  "description"       TEXT,
  "paidAt"            TIMESTAMP(3),
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Payment_razorpayPaymentId_key"
  ON "Payment"("razorpayPaymentId");

CREATE INDEX "Payment_companyId_createdAt_idx"
  ON "Payment"("companyId", "createdAt");

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_subscriptionId_fkey"
  FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
