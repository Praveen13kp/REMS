-- Basic is now ₹499/mo with a meatier feature set so it stops feeling
-- like a teaser. Bumped limits + enabled three feature flags that don't
-- materially cannibalise Pro: leadAging, duplicateDetection, agentPrivacy.
UPDATE "Plan"
SET
  "limits" = jsonb_build_object(
    'users', 10,
    'leads', 1500,
    'projects', 10,
    'storageBytes', 3221225472::bigint,
    'integrations', 3
  ),
  "features" = jsonb_build_object(
    'customPipelineStages', false,
    'leadAging', true,
    'webhookIntake', false,
    'byoIntegrations', false,
    'duplicateDetection', true,
    'agentPrivacy', true,
    'auditLog', false
  ),
  "bullets" = ARRAY[
    '7-day free trial included',
    'Up to 10 users',
    '1,500 leads',
    '10 projects',
    '3 GB file storage',
    'Up to 3 integrations (Facebook, Google, IndiaMART, etc.)',
    'Lead aging alerts',
    'Duplicate-lead detection',
    'Agent privacy controls',
    'Kanban pipeline, tasks, notes, files',
    'CSV import + email notifications',
    'Community support'
  ]
WHERE "code" = 'BASIC';
