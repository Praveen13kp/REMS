# Tenant Isolation Audit — 2026-05

**Audited by:** BE-A-15
**Date:** 2026-05-16
**Branch:** `be/security/S5-BE-A-15-tenant-audit`

## Scope

Every route under `/api/*` was reviewed for tenant-isolation correctness. Each route was classified as:

- **🟢 Green** — uses `tenantPrisma(req)` (auto-injects `companyId`) OR manually scopes every query by `companyId`.
- **🟡 Amber** — uses raw `prisma` but isolates via manual `companyId` in `where` clauses. Relies on correct developer discipline rather than Prisma-level enforcement.
- **🔵 Blue** — intentionally cross-tenant (admin routes, public endpoints).
- **🔴 Red** — uses raw `prisma` without `companyId` scoping in every query.

---

## Route-by-route audit

### 1. Lead module (`/api/leads/*`)

| Route | Method | Middleware | Tenant mechanism | Verdict |
|---|---|---|---|---|
| `/api/leads` | GET | auth + tenant | `tenantPrisma` | 🟢 |
| `/api/leads` | POST | auth + tenant | `tenantPrisma` | 🟢 |
| `/api/leads/:id` | GET | auth + tenant | `tenantPrisma` | 🟢 |
| `/api/leads/:id` | PATCH | auth + tenant | `tenantPrisma` | 🟢 |
| `/api/leads/:id` | DELETE | auth + tenant | `tenantPrisma` | 🟢 |
| `/api/leads/unassigned` | GET | auth + tenant | `tenantPrisma` | 🟢 |
| `/api/leads/:id/assign` | POST | auth + tenant | `tenantPrisma` | 🟢 |
| `/api/leads/bulk-assign` | POST | auth + tenant | `tenantPrisma` | 🟢 |
| `/api/leads/auto-assign` | POST | auth + tenant | `tenantPrisma` | 🟢 |
| `/api/leads/:id/transition` | POST | auth + tenant | `tenantPrisma` | 🟢 |
| `/api/leads/import` | POST | auth + tenant | `tenantPrisma` | 🟢 |
| `/api/leads/check-duplicates` | POST | auth + tenant | `tenantPrisma` | 🟢 |
| `/api/leads/:leadId/activity` | GET | auth + tenant | `tenantPrisma` | 🟢 |

**Notes:** Lead module is fully isolated. All services receive `tenantPrisma` parameter and use it exclusively.

---

### 2. User module (`/api/users/*`)

| Route | Method | Middleware | Tenant mechanism | Verdict |
|---|---|---|---|---|
| `/api/users/invite` | POST | auth | raw `prisma` + manual `companyId` | 🟡 |
| `/api/users/invite/:id/resend` | POST | auth | raw `prisma` + manual `companyId` | 🟡 |
| `/api/users/invite/:token` | GET | none | raw `prisma` (token lookup) | 🔵 |
| `/api/users/invite/:token/accept` | POST | none | raw `prisma` (token lookup) | 🔵 |
| `/api/users/me` | GET | auth | raw `prisma` (self-only, by ID) | 🟡 |
| `/api/users/me` | PATCH | auth | raw `prisma` (self-only, by ID) | 🟡 |
| `/api/users/me/change-password` | POST | auth | raw `prisma` (self-only, by ID) | 🟡 |
| `/api/users/workload` | GET | auth | raw `prisma` + manual `companyId` | 🟡 |
| `/api/users` | GET | auth | raw `prisma` + manual `companyId` | 🟡 |
| `/api/users/:id` | GET | auth | raw `prisma` + manual `companyId` | 🟡 |
| `/api/users/:id` | PATCH | auth | raw `prisma` + manual `companyId` | 🟡 |

**Notes:** User module does NOT use `tenantMiddleware` (because invite/accept flows work without a session). Instead, every controller manually passes `companyId` from `req.user.companyId` into the service. The service adds `companyId` to every `where` clause on multi-user lookups. Self-only endpoints (`/me`, `/me/change-password`) scope by the authenticated user's ID, which is safe. **Risk:** if a future developer copies a user service function and forgets the `companyId` filter, they could leak data across tenants.

---

### 3. Company module (`/api/company/*`)

| Route | Method | Middleware | Tenant mechanism | Verdict |
|---|---|---|---|---|
| `/api/company/register` | POST | none | raw `prisma` (new company, no context needed) | 🔵 |
| `/api/company/me` | GET | auth | raw `prisma` (by authenticated companyId) | 🟡 |
| `/api/company/me` | PATCH | auth | raw `prisma` (by authenticated companyId) | 🟡 |
| `/api/company/me/complete-onboarding` | POST | auth | raw `prisma` (by authenticated companyId) | 🟡 |

**Notes:** Register is public — no tenant concept yet. The other three scope by `req.user.companyId`. Low risk since they operate on a single known record.

---

### 4. Project module (`/api/projects/*`)

| Route | Method | Middleware | Tenant mechanism | Verdict |
|---|---|---|---|---|
| `/api/projects` | GET | auth + tenant | `tenantPrisma` | 🟢 |
| `/api/projects` | POST | auth + tenant | `tenantPrisma` | 🟢 |
| `/api/projects/:id` | GET | auth + tenant | `tenantPrisma` | 🟢 |
| `/api/projects/:id` | PATCH | auth + tenant | `tenantPrisma` | 🟢 |
| `/api/projects/:id` | DELETE | auth + tenant | `tenantPrisma` | 🟢 |

**Notes:** Fully isolated.

---

### 5. Pipeline module (`/api/pipeline/*`)

| Route | Method | Middleware | Tenant mechanism | Verdict |
|---|---|---|---|---|
| `/api/pipeline/stages` | GET | auth + tenant | `tenantPrisma` | 🟢 |
| `/api/pipeline/board` | GET | auth + tenant | `tenantPrisma` | 🟢 |
| `/api/pipeline/stages/reorder` | PATCH | auth + tenant | `tenantPrisma` + manual `companyId` | 🟢 |
| `/api/pipeline/stages/:id` | PATCH | auth + tenant | `tenantPrisma` + manual `companyId` | 🟢 |

**Notes:** The `updateStageService` and `reorderStagesService` pass an explicit `companyId` in addition to using `tenantPrisma`. This is defense-in-depth. However, note that `tenantPrisma.pipelineStage.update({ where: { id } })` does NOT auto-inject `companyId` (because `update` singular is not in `writeWhereOps` in `tenantPrisma.js`). The services compensate by doing a `findFirst` (which IS scoped) before the `update`, so isolation is maintained.

---

### 6. Task module (`/api/tasks/*`)

| Route | Method | Middleware | Tenant mechanism | Verdict |
|---|---|---|---|---|
| `/api/tasks` | GET | auth + tenant | `tenantPrisma` | 🟢 |
| `/api/tasks` | POST | auth + tenant | `tenantPrisma` | 🟢 |
| `/api/tasks/:id` | GET | auth + tenant | `tenantPrisma` | 🟢 |
| `/api/tasks/:id` | PATCH | auth + tenant | `tenantPrisma` | 🟢 |
| `/api/tasks/:id` | DELETE | auth + tenant | `tenantPrisma` | 🟢 |
| `/api/tasks/:id/complete` | POST | auth + tenant | `tenantPrisma` | 🟢 |

**Notes:** Fully isolated.

---

### 7. Note module (`/api/notes/*`)

| Route | Method | Middleware | Tenant mechanism | Verdict |
|---|---|---|---|---|
| `/api/notes` | GET | auth + tenant | `tenantPrisma` | 🟢 |
| `/api/notes` | POST | auth + tenant | `tenantPrisma` | 🟢 |
| `/api/notes/:id` | PATCH | auth + tenant | `tenantPrisma` | 🟢 |
| `/api/notes/:id` | DELETE | auth + tenant | `tenantPrisma` | 🟢 |

**Notes:** Fully isolated.

---

### 8. File module (`/api/files/*`)

| Route | Method | Middleware | Tenant mechanism | Verdict |
|---|---|---|---|---|
| `/api/files` | GET | auth + tenant | `tenantPrisma` | 🟢 |
| `/api/files/folders` | GET | auth + tenant | `tenantPrisma` | 🟢 |
| `/api/files/usage` | GET | auth + tenant | `tenantPrisma` | 🟢 |
| `/api/files` | POST | auth + tenant | `tenantPrisma` | 🟢 |
| `/api/files/:id/download` | GET | auth + tenant | `tenantPrisma` | 🟢 |
| `/api/files/:id` | DELETE | auth + tenant | `tenantPrisma` | 🟢 |

**Notes:** Fully isolated.

---

### 9. Notification module (`/api/notifications/*`)

| Route | Method | Middleware | Tenant mechanism | Verdict |
|---|---|---|---|---|
| `/api/notifications` | GET | auth + tenant | `tenantPrisma` | 🟢 |
| `/api/notifications/unread-count` | GET | auth + tenant | `tenantPrisma` | 🟢 |
| `/api/notifications/counts` | GET | auth + tenant | `tenantPrisma` | 🟢 |
| `/api/notifications/read-all` | PATCH | auth + tenant | `tenantPrisma` | 🟢 |
| `/api/notifications/:id/read` | PATCH | auth + tenant | `tenantPrisma` | 🟢 |
| `/api/notifications/:id` | DELETE | auth + tenant | `tenantPrisma` | 🟢 |
| `/api/notifications` | DELETE | auth + tenant | `tenantPrisma` | 🟢 |

**Notes:** Fully isolated. Notifications additionally scope by `userId` (user-level access within the tenant).

---

### 10. Dashboard module (`/api/dashboard/*`)

| Route | Method | Middleware | Tenant mechanism | Verdict |
|---|---|---|---|---|
| `/api/dashboard/owner` | GET | auth + tenant | `tenantPrisma` | 🟢 |
| `/api/dashboard/manager` | GET | auth + tenant | `tenantPrisma` | 🟢 |
| `/api/dashboard/agent` | GET | auth + tenant | `tenantPrisma` | 🟢 |
| `/api/dashboard/reports` | GET | auth + tenant | `tenantPrisma` | 🟢 |

**Notes:** Fully isolated.

---

### 11. Admin module (`/api/admin/*`)

| Route | Method | Middleware | Tenant mechanism | Verdict |
|---|---|---|---|---|
| `/api/admin/stats` | GET | auth + requirePlatformAdmin | raw `prisma` (cross-tenant) | 🔵 |
| `/api/admin/companies` | GET | auth + requirePlatformAdmin | raw `prisma` (cross-tenant) | 🔵 |
| `/api/admin/companies/:id` | GET | auth + requirePlatformAdmin | raw `prisma` (cross-tenant) | 🔵 |
| `/api/admin/companies/:id` | PATCH | auth + requirePlatformAdmin | raw `prisma` (cross-tenant) | 🔵 |
| `/api/admin/companies/:id` | DELETE | auth + requirePlatformAdmin | raw `prisma` (cross-tenant) | 🔵 |
| `/api/admin/signups/recent` | GET | auth + requirePlatformAdmin | raw `prisma` (cross-tenant) | 🔵 |
| `/api/admin/signups/weekly` | GET | auth + requirePlatformAdmin | raw `prisma` (cross-tenant) | 🔵 |
| `/api/admin/health` | GET | auth + requirePlatformAdmin | raw `prisma` (cross-tenant) | 🔵 |
| `/api/admin/activity` | GET | auth + requirePlatformAdmin | raw `prisma` (cross-tenant) | 🔵 |

**Notes:** All admin routes intentionally use raw `prisma` for cross-tenant access. Guarded by `requirePlatformAdmin` middleware which checks for `PLATFORM_ADMIN` or `SUPER_ADMIN` role. This is the correct pattern. **Risk:** the admin service is the single module that, if compromised (e.g., a session token leak for a SUPER_ADMIN), could expose all tenant data.

---

### 12. Contact module (`/api/public/contact`)

| Route | Method | Middleware | Tenant mechanism | Verdict |
|---|---|---|---|---|
| `/api/public/contact` | POST | rate-limit only | raw `prisma` (no tenant concept) | 🔵 |

**Notes:** Public endpoint. No authentication. Writes to `ContactSubmission` model which has no `companyId`.

---

## Defense-in-depth analysis

### `tenantPrisma.js` extension coverage

The `tenantModels` list covers all tenant-scoped models:
`User`, `Lead`, `Project`, `Task`, `Activity`, `Note`, `PipelineStage`, `Notification`, `File`

**Not covered (intentionally):**
- `Company` — managed by its own service, scoped by `companyId` passed manually
- `Invite` — public token lookup flow, raw prisma is acceptable
- `Session` / `Account` / `Verification` — auth infrastructure, no tenant concept
- `PlatformAudit` — admin-only, cross-tenant by design
- `ContactSubmission` — public form, no tenant

### Risky patterns

1. **Singular `update`/`delete` bypass `tenantPrisma` scoping.** The extension only injects `companyId` for `updateMany` / `deleteMany`, not for singular `update` / `delete` / `upsert`. Example:

   ```js
   // In note.service.js — does NOT auto-inject companyId:
   await tenantPrisma.note.update({ where: { id: noteId }, data: { content } });
   ```

   These calls are currently safe because they are preceded by `findFirst` (which IS scoped). But if a developer removes the `findFirst` check, the singular mutation becomes a cross-tenant risk. **Recommendation:** add `update`, `delete`, and `upsert` to `writeWhereOps` in `tenantPrisma.js`, or always use the `Many` variants.

2. **User module uses raw `prisma`.** While every multi-user query in `user.service.js` manually includes `companyId`, there is no automated guard. A future contributor could add a new function that queries `prisma.user.findUnique` without a `companyId` filter and accidentally expose user data.

---

## Cross-tenant probe results

| Test | Test | Company A | Company B | Expected | Result |
|---|---|---|---|---|---|
| GET Company B lead by ID | userA.token | leadB.id | 404 | ✅ Pass |
| PATCH Company B lead | userA.token | leadB.id | 404 | ✅ Pass |
| DELETE Company B lead | userA.token | leadB.id | 404 | ✅ Pass |
| GET Company B project | userA.token | projectB.id | 404 | ✅ Pass |
| PATCH Company B project | userA.token | projectB.id | 404 | ✅ Pass |
| DELETE Company B project | userA.token | projectB.id | 404 | ✅ Pass |
| GET Company B task | userA.token | taskB.id | 404 | ✅ Pass |
| PATCH Company B task | userA.token | taskB.id | 404 | ✅ Pass |
| DELETE Company B task | userA.token | taskB.id | 404 | ✅ Pass |
| PATCH Company B note | userA.token | noteB.id | 404 | ✅ Pass |
| DELETE Company B note | userA.token | noteB.id | 404 | ✅ Pass |

Cross-tenant probes are implemented in [`backend/tests/tenant-isolation.test.js`](../../backend/tests/tenant-isolation.test.js). Run with `npm test`.

---

## Raw `prisma` import guard

A CI-compatible lint test is at [`backend/tests/no-raw-prisma-in-controllers.test.js`](../../backend/tests/no-raw-prisma-in-controllers.test.js). It scans controller files for `require("../../config/prisma")` imports and fails if found. Controllers must receive database access via `req.tenantPrisma` or injected parameters only.

---

## Recommendations

1. **Add `update`, `delete`, `upsert` to `writeWhereOps`** in `backend/src/lib/tenantPrisma.js` so singular mutations also get `companyId` auto-injected. This would make the extension consistent and eliminate the reliance on preceding `findFirst` checks.
2. **Add `User` routes to `tenantMiddleware`** where possible (`/users`, `/users/:id`, `/workload`). The invite/accept routes must remain outside, but team-management routes could benefit from the extra safety layer.
3. **Document the admin module** as a high-value target. Ensure SUPER_ADMIN sessions have short TTLs and are logged.
