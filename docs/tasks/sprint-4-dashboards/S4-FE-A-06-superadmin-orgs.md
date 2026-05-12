# S4-FE-A-06 — SuperAdmin & Orgs (platform-admin shell)

> **Updated 2026-05-12:** Port `leadpro-realty/src/pages/{SuperAdmin,Orgs}.jsx` directly. Leadpro keeps super-admin INSIDE the same `DashboardLayout` (no separate layout) but with a different role-scoped sidebar — we'll do the same: same `DashboardLayout`, RoleRoute gates `/admin/*`. Use leadpro CSS (`.kpi-grid`, `.activity-item`, `.activity-dot`, `.activity-meta`, `.row-actions`, `.table-wrap`, `.table-toolbar`, `.topbar-search`, `.data`, `.badge`). No shadcn, no recharts.

**Owner:** FE-A
**Branch:** `fe/platform/S4-FE-A-06-superadmin-orgs`
**Estimated:** 1 day
**Blocks:** —
**Blocked by:** S0-FE-A-01 (auth + role guards), platform-admin API surface (may be partially stubbed)

## Goal

Build the platform-admin area (SuperAdmin dashboard + Orgs table) from the manager's static UI. Only reachable by `PLATFORM_ADMIN` role; lives outside the tenant `AppLayout` so super-admins don't see tenant nav.

## Files to read first

- `_tmp_leadpro/leadpro-realty/src/pages/SuperAdmin.jsx`
- `_tmp_leadpro/leadpro-realty/src/pages/Orgs.jsx`
- `frontend/src/components/common/{ProtectedRoute,RoleRoute}.jsx`
- Backend platform endpoints (stub if missing — coordinate with BE-A): `GET /api/admin/companies`, `PATCH /api/admin/companies/:id`, `GET /api/admin/stats`
- `docs/STATIC-UI-MAP.md`

## Steps

1. **Routing** — wrap inside `DashboardLayout` with `<RoleRoute allowedRoles={["PLATFORM_ADMIN"]}>`:
   - `/admin` → `SuperAdmin`
   - `/admin/orgs` → `Orgs`
   - `/admin/orgs/:id` → `OrgDetail` (a leadpro `.modal-backdrop` + `.modal` for now)

2. **SuperAdmin (overview)** — `pages/SuperAdmin.jsx`. Port leadpro `SuperAdmin.jsx`:
   - `.content-head` "Platform Overview".
   - `.kpi-grid` with 4 KpiCards (lucide icons): Organisations, Total Users, Total Leads, MRR.
   - `.grid.grid-2`:
     - "System Health" card: 5 rows (API Uptime / Database / Email Service / Background Jobs / Storage) each with status badge.
     - "Recent Sign-Ups" card: org rows with avatar, name, `{userCount} users · {plan}`, "x ago".
   - "Recent System Activity" card with `.activity-item` rows (dot + lucide `Activity` icon + text + `.activity-meta`).
   - No charts in leadpro's SuperAdmin — do NOT add recharts/chart.js here unless BE provides signup-weekly data; then use chart.js Bar.

3. **Orgs** — `pages/Orgs.jsx`. Port leadpro `Orgs.jsx`:
   - `.content-head` with "Organisations" H1 + "New Organisation" button.
   - `.table-wrap` containing `.table-toolbar` with `.topbar-search`, then `.data` table: Organisation (avatar + name + timezone) / Plan badge / Users / Industry / Created / `.row-actions` (Eye / Ban / Trash2).
   - Row Ban click → `.modal` "Suspend organisation?" confirm. PATCH `/api/admin/companies/:id { status: SUSPENDED }`.

4. **Role + impersonation guardrails**:
   - `PLATFORM_ADMIN` is checked client-side AND server-side. Never trust UI alone.
   - No "log in as" impersonation in MVP — defer.

## Acceptance criteria

- [ ] `/admin/*` 403s for non-platform-admin users (UI guard + server enforces)
- [ ] Overview and Orgs render with real data (or clearly-labelled stub data)
- [ ] Suspend/restore action works with optimistic update + revert on error
- [ ] No tenant sidebar or tenant routes leak into platform layout
- [ ] No console errors

## AI prompt template

> I'm on task S4-FE-A-06. Read the manager's `SuperAdmin.jsx` and `Orgs.jsx`, our existing `RoleRoute`, and the platform admin API contracts (or stub status). Build the platform layout + two pages. Show me the route placement (separate `<Route element={<PlatformLayout/>}>` block, not nested under AppLayout) and the role-check strategy before writing.

## Static UI reference (updated 2026-05-12)

- **Source of truth:** `leadpro-realty/src/pages/{SuperAdmin,Orgs}.jsx`. Port directly.
- **Classes:** leadpro CSS. No shadcn, no recharts.
- **State:** `usePlatformStore` + `adminService` wrapping `/api/admin/*`.

## Notes for reviewer

- Visual differentiation matters — super-admin must never confuse this with a tenant view. Use a top banner ("Platform Admin") and a different accent color.
- Stub endpoints are fine; clearly mark them with `TODO(BE)` comments referencing the future BE task.
