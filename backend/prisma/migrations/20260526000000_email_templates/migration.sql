-- Email templates: tenant-managed reusable email bodies that the Send
-- Email panel on the lead detail page can pull from. Each tenant gets
-- their own library; seeded with a few starter templates below.
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmailTemplate_companyId_idx" ON "EmailTemplate"("companyId");

ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed three starter templates for every existing tenant so the Send
-- Email modal isn't empty on first use. New tenants get the same set
-- via the application-level seed in emailTemplate.service.js.
INSERT INTO "EmailTemplate" ("id", "companyId", "name", "subject", "body", "category", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  c.id,
  t.name,
  t.subject,
  t.body,
  t.category,
  NOW(),
  NOW()
FROM "Company" c
CROSS JOIN (VALUES
  (
    'First Contact',
    'Thank you for your interest, {{lead.name}}',
    E'Hi {{lead.name}},\n\nThanks for reaching out about our properties. I''m {{user.name}} from {{company.name}} and I''d love to help you find the right fit.\n\nWhen would be a good time for a quick call?\n\nBest regards,\n{{user.name}}',
    'Outreach'
  ),
  (
    'Site Visit Invitation',
    'Site visit at {{company.name}}',
    E'Hi {{lead.name}},\n\nWe''d love to show you the project in person. Are you available this weekend for a guided site visit?\n\nLet me know a time that works and I''ll block it on my calendar.\n\nThanks,\n{{user.name}}\n{{company.name}}',
    'Site Visit'
  ),
  (
    'Follow-up',
    'Following up on our conversation',
    E'Hi {{lead.name}},\n\nJust circling back on our earlier conversation. Happy to share more details, schedule a visit, or answer any questions you still have.\n\nLooking forward to hearing from you.\n\nBest,\n{{user.name}}',
    'Follow-up'
  )
) AS t(name, subject, body, category);
