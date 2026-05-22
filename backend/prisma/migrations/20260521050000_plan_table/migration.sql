-- DB-backed plan catalogue. Replaces the hardcoded values in
-- lib/planLimits.js as the source of truth. Seeded with the three live
-- plans so the cutover is transparent.

CREATE TABLE "Plan" (
  "id"                    TEXT NOT NULL,
  "code"                  TEXT NOT NULL,
  "name"                  TEXT NOT NULL,
  "tagline"               TEXT NOT NULL,
  "featured"              BOOLEAN NOT NULL DEFAULT false,
  "sortOrder"             INTEGER NOT NULL DEFAULT 100,
  "priceMonthly"          INTEGER NOT NULL DEFAULT 0,
  "priceAnnual"           INTEGER NOT NULL DEFAULT 0,
  "trialDays"             INTEGER NOT NULL DEFAULT 0,
  "limits"                JSONB NOT NULL,
  "features"              JSONB NOT NULL,
  "bullets"               TEXT[] NOT NULL,
  "support"               TEXT,
  "onboarding"            TEXT,
  "razorpayPlanIdMonthly" TEXT,
  "razorpayPlanIdAnnual"  TEXT,
  "archivedRazorpayPlanIds" JSONB,
  "isActive"              BOOLEAN NOT NULL DEFAULT true,
  "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"             TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Plan_code_key" ON "Plan"("code");

-- Seed the three live plans. Mirrors lib/planLimits.js exactly.
INSERT INTO "Plan" (
  "id", "code", "name", "tagline", "featured", "sortOrder",
  "priceMonthly", "priceAnnual", "trialDays",
  "limits", "features", "bullets", "support", "onboarding",
  "isActive", "createdAt", "updatedAt"
) VALUES
(
  'plan_basic_seed', 'BASIC', 'Basic', 'Try LeadPro free for 7 days',
  false, 10, 0, 0, 7,
  '{"users":3,"leads":200,"projects":2,"storageBytes":524288000,"integrations":0}'::jsonb,
  '{"customPipelineStages":false,"leadAging":false,"webhookIntake":false,"byoIntegrations":false,"duplicateDetection":false,"agentPrivacy":false,"auditLog":false}'::jsonb,
  ARRAY[
    '7-day free trial',
    'Up to 3 users',
    '200 leads',
    '2 projects',
    '500 MB file storage',
    'Kanban pipeline + contacts',
    'Tasks, notes, activity log',
    'CSV import',
    'Email notifications',
    'Community support'
  ],
  'Community', 'Self-serve',
  true, NOW(), NOW()
),
(
  'plan_pro_seed', 'PRO', 'Pro', 'For growing sales teams',
  true, 20, 249900, 199900, 0,
  '{"users":10,"leads":10000,"projects":25,"storageBytes":5368709120,"integrations":null}'::jsonb,
  '{"customPipelineStages":true,"leadAging":true,"webhookIntake":true,"byoIntegrations":true,"duplicateDetection":true,"agentPrivacy":true,"auditLog":false}'::jsonb,
  ARRAY[
    'Everything in Basic',
    'Up to 10 users',
    '10,000 leads',
    '25 projects',
    '5 GB file storage',
    'BYO integrations: Facebook, Instagram, Google, IndiaMART, JustDial, Website',
    'Webhook lead intake',
    'Custom pipeline stages',
    'Lead aging alerts',
    'Duplicate-lead detection',
    'Agent privacy controls',
    'Email support'
  ],
  'Email', 'Self-serve',
  true, NOW(), NOW()
),
(
  'plan_enterprise_seed', 'ENTERPRISE', 'Enterprise', 'For builders & large brokerages',
  false, 30, 899900, 719900, 0,
  '{"users":null,"leads":null,"projects":null,"storageBytes":null,"integrations":null}'::jsonb,
  '{"customPipelineStages":true,"leadAging":true,"webhookIntake":true,"byoIntegrations":true,"duplicateDetection":true,"agentPrivacy":true,"auditLog":true}'::jsonb,
  ARRAY[
    'Everything in Pro',
    'Unlimited users',
    'Unlimited leads & projects',
    'Unlimited file storage',
    'Audit log (compliance-ready)',
    'Priority support (email + phone)',
    'Guided onboarding session'
  ],
  'Priority email + phone', 'Guided session',
  true, NOW(), NOW()
);
