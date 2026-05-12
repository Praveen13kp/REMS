# S4-FE-A-04 — Profile, Settings & Notifications pages

**Owner:** FE-A
**Branch:** `fe/account/S4-FE-A-04-profile-settings-notifications`
**Estimated:** 1 day
**Blocks:** —
**Blocked by:** S2-BE-A-01 (user profile API), S0-FE-A-02 (app shell)

## Goal

Wire the three account-area pages from the manager's UI to real data: **Profile** (edit name/avatar/password), **Settings** (company-level + per-user prefs), **Notifications** (in-app inbox).

## Files to read first

- `_tmp_leadpro/leadpro-realty/src/pages/Profile.jsx`
- `_tmp_leadpro/leadpro-realty/src/pages/Settings.jsx`
- `_tmp_leadpro/leadpro-realty/src/pages/Notifications.jsx`
- `frontend/src/stores/authStore.js`
- Backend endpoints: `PATCH /api/users/me`, `POST /api/users/me/password`, `GET /api/company/me`, `PATCH /api/company/me`, `GET /api/notifications`, `PATCH /api/notifications/:id/read`
- `docs/STATIC-UI-MAP.md`

## Steps

1. **Profile** — `pages/admin/Profile.jsx` (under app shell):
   - shadcn `Tabs`: "Profile" / "Password".
   - Profile tab: avatar upload, name, email (read-only), phone — `Form` + zod, `PATCH /api/users/me`, refresh `authStore.user`.
   - Password tab: current/new/confirm — `Form` + zod, `POST /api/users/me/password`.
   - Both tabs show inline success + toast.

2. **Settings** — `pages/admin/Settings.jsx`:
   - Role-gated: OWNER/ADMIN see all sections; AGENT sees only "My preferences".
   - shadcn `Card` per section:
     - Company (name, GST, address) — `PATCH /api/company/me`.
     - Branding (logo, primary color) — optional, stub if BE not ready.
     - My preferences (theme via `ThemeToggle`, default landing page, density).
   - Save buttons per section; dirty state tracked locally; no global form.

3. **Notifications** — `pages/shared/Notifications.jsx`:
   - List grouped by day, newest first.
   - Each item: icon by type, title, body, time, "mark read" / "open" actions.
   - Filter tabs (`Tabs`): All / Unread / Mentions / System.
   - "Mark all read" button in header.
   - Pagination or infinite scroll (use `useInfiniteList` pattern from S2-FE-B-01 if present, else simple Prev/Next).
   - Polls every 60s while page is focused (use a small `useInterval` hook).

4. **Sidebar wiring** — ensure these three routes are reachable from `Sidebar.jsx` and the user-menu dropdown in `AppLayout`.

## Acceptance criteria

- [ ] Profile edit + password change end-to-end, errors surfaced
- [ ] Settings sections save independently; AGENT sees only "My preferences"
- [ ] Notifications list renders, mark-read works, "mark all read" works
- [ ] Tabs/filters work on Notifications
- [ ] All three pages use shadcn primitives only — no custom modals or form CSS
- [ ] No console errors

## AI prompt template

> I'm on task S4-FE-A-04. Read the manager's `Profile.jsx`, `Settings.jsx`, `Notifications.jsx` for layout intent, then the BE contracts listed in this task. Wire all three pages to real APIs using shadcn primitives. Show me which sections in Settings are role-gated and how you'll structure the role check before writing.

## Static UI reference (added 2026-05-11)

- **Layout reference:** `_tmp_leadpro/leadpro-realty/src/pages/{Profile,Settings,Notifications}.jsx`.
- **Restyle:** shadcn `Tabs`, `Card`, `Form`, `Input`, `Select`, `Button`, `Avatar`, `Switch`, `Separator`, `ScrollArea`, `Badge`.
- **State:** `useAuthStore` (profile), new `useSettingsStore` + `companyService`, new `useNotificationsStore` + `notificationService`. Toasts via `sonner`.
- **Theme:** reuse the `ThemeToggle` from `AppLayout` — don't fork.

## Notes for reviewer

- AGENT must NOT see the company section (server returns 403 too — UI gate first).
- Avatar upload can be data-URL preview only if BE upload endpoint isn't ready — mark TODO with the linked BE task and don't block.
