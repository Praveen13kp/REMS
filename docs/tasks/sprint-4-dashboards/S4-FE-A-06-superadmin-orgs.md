# S4-FE-A-06 — SuperAdmin & Orgs (platform-admin shell)

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

1. **`PlatformLayout`** — `frontend/src/layouts/PlatformLayout.jsx`:
   - Distinct sidebar (red/dark accent so you know you're in admin land).
   - Links: Overview (`/admin`), Organizations (`/admin/orgs`).
   - User menu with "Back to my company" link if the super-admin also owns a tenant.

2. **Routing** — wrap routes in `<RoleRoute allowedRoles={["PLATFORM_ADMIN"]}>`:
   - `/admin` → `SuperAdmin`
   - `/admin/orgs` → `Orgs`
   - `/admin/orgs/:id` → `OrgDetail` (read-only drawer if no edit endpoints yet)

3. **SuperAdmin (overview)** — `pages/superadmin/SuperAdmin.jsx`:
   - KPI strip: Total orgs, Active users, MRR (stub), New signups (7d).
   - Recent signups table.
   - System health card (DB/API status — stub OK).
   - Charts: signups/week, orgs by plan.

4. **Orgs** — `pages/superadmin/Orgs.jsx`:
   - `Table` of all companies: name, plan, users, leads, status, created, actions.
   - Filters: plan, status, search.
   - Row click → drawer (`Sheet`) with org detail + suspend/restore toggle.

5. **Role + impersonation guardrails**:
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

## Static UI reference (added 2026-05-11)

- **Layout reference:** `_tmp_leadpro/leadpro-realty/src/pages/{SuperAdmin,Orgs}.jsx`.
- **Restyle:** shadcn `Card`, `Table`, `Sheet` (org detail drawer), `Badge` (plan/status), `Tabs`, `Switch` (suspend/restore), `Select`, `Input`. Charts via **recharts**. Sidebar via `@/components/ui/sidebar.jsx` with a distinct color token.
- **State:** new `usePlatformStore` + `adminService`. Toasts via `sonner`.

## Notes for reviewer

- Visual differentiation matters — super-admin must never confuse this with a tenant view. Use a top banner ("Platform Admin") and a different accent color.
- Stub endpoints are fine; clearly mark them with `TODO(BE)` comments referencing the future BE task.
