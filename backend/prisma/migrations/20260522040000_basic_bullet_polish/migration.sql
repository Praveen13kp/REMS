-- Shorten Basic's integrations bullet so it fits on one line in the
-- pricing card grid (the long "(Facebook, Google, IndiaMART, etc.)"
-- version wrapped to two rows and made the bullet list look misaligned).
UPDATE "Plan"
SET "bullets" = ARRAY[
  '7-day free trial included',
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
