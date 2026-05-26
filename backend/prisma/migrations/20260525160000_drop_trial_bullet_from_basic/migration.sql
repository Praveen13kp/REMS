-- Trial and subscription are now separate concepts: the trial is a
-- universal 7-day window granted at signup, and the plans are the paid
-- tiers users move to afterwards. Drop the "7-day free trial included"
-- bullet from the Basic card so the plans don't double-advertise the
-- trial inside their feature list.
UPDATE "Plan"
SET "bullets" = ARRAY[
  'Up to 10 users',
  '1,500 leads',
  '10 projects',
  '3 GB file storage',
  '3 lead-source integrations',
  'Lead aging alerts',
  'Duplicate-lead detection',
  'Agent privacy controls',
  'Kanban pipeline, tasks, notes, files',
  'CSV import + email notifications',
  'Community support'
]
WHERE "code" = 'BASIC';
