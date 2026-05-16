# Sprint 5 — Leads, Broker, External Intake

**Branch:** `sprint-5/leads-broker-intake` (off `main`)
**Team:** TL-FE (Dipak), FE dev, BE dev (other BE still absent)
**Goal:** Make leads actually work end-to-end, open the system to external lead sources (Facebook/Instagram), introduce the Broker role, fix multi-tenant email, and split SuperAdmin login. Plus burn down the long tail of "BE endpoint missing" TODOs left over from Sprint 4.

## Task index

### Quick wins (do first, unblock the team)
- [S5-FE-B-01](S5-FE-B-01-remove-social-login.md) — Remove GitHub + Microsoft social login, keep Google
- [S5-FE-B-02](S5-FE-B-02-pricing-on-landing.md) — Add Pricing section to Landing page
- [S5-FE-A-05](S5-FE-A-05-repo-cleanup.md) — Move stray `*.txt` completion reports out of repo root

### Auth + tenancy (security-critical)
- [S5-BE-A-01](S5-BE-A-01-multi-tenant-email.md) — Multi-tenant email (same email across companies)
- [S5-FE-A-01](S5-FE-A-01-login-company-picker.md) — Login UI company picker (blocked by S5-BE-A-01)
- [S5-BE-A-02](S5-BE-A-02-superadmin-login-endpoint.md) — Separate SUPER_ADMIN login endpoint
- [S5-FE-B-03](S5-FE-B-03-superadmin-login-page.md) — Separate `/superadmin/login` page (blocked by S5-BE-A-02)
- [S5-BE-A-15](S5-BE-A-15-tenant-isolation-audit.md) — Audit tenant isolation across all endpoints

### Leads core
- [S5-BE-A-03](S5-BE-A-03-leads-endpoints-fix.md) — Fix Kanban / Table / Quick Actions endpoints
- [S5-FE-B-04](S5-FE-B-04-leads-ui-fix.md) — Fix Kanban / Table / Quick Actions UI (blocked by S5-BE-A-03)
- [S5-FE-B-06](S5-FE-B-06-lead-priority-field.md) — Wire lead `priority` field
- [S5-BE-A-16](S5-BE-A-16-activity-log-audit.md) — Audit activity log emission

### External intake
- [S5-BE-A-04](S5-BE-A-04-fb-ig-intake.md) — Facebook + Instagram webhook intake
- [S5-FE-B-05](S5-FE-B-05-integrations-panel.md) — Integrations settings panel (blocked by S5-BE-A-04)

### Broker role
- [S5-BE-A-05](S5-BE-A-05-broker-backend.md) — Broker role + BrokerCompany + scoped endpoints
- [S5-FE-A-02](S5-FE-A-02-broker-dashboard.md) — Broker dashboard + company switcher (blocked by S5-BE-A-05)

### Settings tab back-fill (Sprint 4 leftovers)
- [S5-BE-A-06](S5-BE-A-06-settings-endpoints.md) — Settings page missing endpoints
- [S5-BE-A-07](S5-BE-A-07-user-crud.md) — Team page user CRUD
- [S5-BE-A-08](S5-BE-A-08-notifications-mutations.md) — Notifications mark-read / delete
- [S5-BE-A-09](S5-BE-A-09-profile-put.md) — Profile PUT /users/me
- [S5-BE-A-10](S5-BE-A-10-assign-endpoints.md) — Assign-page endpoints
- [S5-BE-A-11](S5-BE-A-11-tasks-bucket.md) — Tasks bucket filter
- [S5-BE-A-12](S5-BE-A-12-public-contact.md) — Public contact form endpoint
- [S5-BE-A-13](S5-BE-A-13-plan-based-file-quotas.md) — Plan-based file storage quotas
- [S5-BE-A-14](S5-BE-A-14-real-mrr.md) — Real MRR calculation

### Quality
- [S5-FE-A-03](S5-FE-A-03-close-sprint-4-bug-bash.md) — Close Sprint-4 bug-bash PR
- [S5-FE-A-04](S5-FE-A-04-write-sprint-5-tasks.md) — Write Sprint 5 task files (this folder)
- [S5-shared-01](S5-shared-01-bug-bash-walkthrough.md) — Run S4-shared-01 bug-bash walkthrough
- [S5-shared-02](S5-shared-02-csv-import-polish.md) — CSV import polish (BE + FE)

## Merge order (avoid stomping)

1. S5-FE-B-01, S5-FE-B-02, S5-FE-A-05 (independent quick wins)
2. S5-BE-A-15 tenant audit → S5-BE-A-01 multi-tenant email → S5-FE-A-01 login UI
3. S5-BE-A-02 → S5-FE-B-03 (superadmin)
4. S5-BE-A-03 + S5-BE-A-16 → S5-FE-B-04, S5-FE-B-06 (leads)
5. S5-BE-A-04 → S5-FE-B-05 (intake)
6. Settings backfills (#06–#14) in small parallel PRs
7. S5-BE-A-05 → S5-FE-A-02 (broker — biggest, last)
8. S5-shared-01 bug-bash run before MVP cut
