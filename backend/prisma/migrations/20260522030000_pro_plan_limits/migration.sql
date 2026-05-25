-- Pro tier rebalanced to maintain a clear 5x step over Basic now that
-- Basic was buffed. Storage 5 GB → 25 GB, users 10 → 50, leads 10k → 25k,
-- projects 25 → 50. Features unchanged. Bullets refreshed to match.
UPDATE "Plan"
SET
  "limits" = jsonb_build_object(
    'users', 50,
    'leads', 25000,
    'projects', 50,
    'storageBytes', 26843545600::bigint, -- 25 * 1024^3
    'integrations', null
  ),
  "bullets" = ARRAY[
    'Everything in Basic, plus:',
    '50 users · 25,000 leads · 50 projects',
    '25 GB file storage',
    'All 6 integrations (no 3-integration cap)',
    'Webhook lead intake',
    'Custom pipeline stages',
    'Email support'
  ]
WHERE "code" = 'PRO';
