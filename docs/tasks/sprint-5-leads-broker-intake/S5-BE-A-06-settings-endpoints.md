# S5-BE-A-06 — Settings page missing endpoints

**Owner:** BE dev
**Branch:** Multiple sub-PRs — `be/settings/S5-BE-A-06a-*`, `-06b-*`, etc.
**Estimated:** 2–3 days total, split per tab
**Blocks:** —
**Blocked by:** —

## Goal

`admin/Settings.jsx` has 9 sub-tabs all marked `TODO: BE endpoint missing`. Implement them. Each can be a small standalone PR; don't ship one giant one.

## Sub-tabs (one PR each)

| Tab | Endpoints | Notes |
|---|---|---|
| Notifications preferences | GET, PUT `/users/me/notification-prefs` | per-user toggles |
| SMTP | GET, PUT `/company/smtp` | OWNER only; encrypt password at rest |
| Plan & invoices | GET `/company/plan`, GET `/company/invoices` | depends on a future billing system; stub plan data for now is OK |
| RBAC matrix | GET, PUT `/company/rbac` | per-role permission flags |
| API keys | GET, POST, DELETE `/company/api-keys` | hash on server; show plaintext once |
| Audit log | GET `/company/audit-log?page=...` | reuse Activity table or new AuditEvent model |
| Custom fields | GET, PUT `/company/custom-fields` | JSON schema describing lead extra fields |
| Webhooks | CRUD `/company/webhooks` | URL + secret + event filter |
| Integrations connect/disconnect | covered by S5-BE-A-04 + future Slack/Calendar | mark Slack TODO if not built |

## Acceptance criteria (per sub-PR)

- [ ] Endpoint exists, tenant-scoped, role-gated
- [ ] FE TODO comment removed
- [ ] At least one integration test
