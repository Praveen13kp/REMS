# S4-FE-A-04 — Profile, Settings & Notifications pages

> **Updated 2026-05-12:** Port these three pages directly from `leadpro-realty/src/pages/{Profile,Settings,Notifications}.jsx`. Use leadpro CSS classes (`.card`, `.field`, `.input`, `.select`, `.checkbox`, `.switch`, `.nav-item`, `.notif`, `.notif-list`, `.tabs`, `.tab`) — **not shadcn** `Tabs`/`Card`/`Form`/`Switch`. Settings is a **left-nav of 13 tabs** (not horizontal tabs). Modals use `.modal-backdrop` / `.modal` (already in PublicLayout/DashboardLayout work).

**Owner:** FE-A
**Branch:** `fe/account/S4-FE-A-04-profile-settings-notifications`
**Estimated:** 1 day
**Blocks:** —
**Blocked by:** S2-BE-A-01 (user profile API), S0-FE-A-02 (app shell)

## Goal

Wire the three account-area pages from the manager's UI to real data: **Profile** (edit name/avatar/password), **Settings** (company-level + per-user prefs), **Notifications** (in-app inbox).

## Files to read first

- `leadpro-realty/src/pages/Profile.jsx`
- `leadpro-realty/src/pages/Settings.jsx`
- `leadpro-realty/src/pages/Notifications.jsx`
- `frontend/src/stores/authStore.js`
- Backend endpoints: `PATCH /api/users/me`, `POST /api/users/me/password`, `GET /api/company/me`, `PATCH /api/company/me`, `GET /api/notifications`, `PATCH /api/notifications/:id/read`
- `docs/STATIC-UI-MAP.md`

## Steps

1. **Profile** — `pages/Profile.jsx`. Port `leadpro-realty/src/pages/Profile.jsx` 1:1 — single `.card` with avatar `.avatar.lg`, badge, "Change Photo" button, and `.grid.grid-2` with 4 `.field`s (name/email/phone/department). Wire to `PATCH /api/users/me`, refresh `authStore.user`. (Password change lives in Settings → Security tab; do NOT add a Password tab inside Profile.)

2. **Settings** — `pages/Settings.jsx`. Port leadpro 2-column layout: `gridTemplateColumns: '240px 1fr'`. Left column is a `.card` with **13 `nav-item` buttons**:
   1. General (workspace name, industry, timezone, currency, date format, language)
   2. Profile (renders `<Profile />`)
   3. Security (change password + 2FA toggle via `.switch`)
   4. Notifications (per-event Email / In-app / Push checkboxes: New lead assigned, Follow-up reminder, Lead status changed, New booking, Daily summary, Weekly report)
   5. Integrations (grid of 8 integration cards — MagicBricks, 99acres, WhatsApp Business, Razorpay, Google Calendar, Mailchimp, Twilio, Slack — with connect/disconnect badges)
   6. Email (SMTP) — stub
   7. Billing (current plan card + invoices table)
   8. Appearance (theme: Dark/Light buttons, sidebar collapsed checkbox)
   9. Roles & Permissions — stub for MVP, "Coming soon" card
   10. API Keys — stub
   11. Audit Log (table: when / user / action / target / IP)
   12. Custom Fields — stub
   13. Webhooks — stub
   Right column is `<TabContent tab={tab} />`. Role-gate: AGENT only sees Profile + Appearance + Notifications. Each tab has its own Save button.

3. **Notifications** — `pages/Notifications.jsx`. Port leadpro Notifications.jsx:
   - `.content-head` with H1 + "{unread} unread of {total}" subtext, "Mark all read" + "Clear all" buttons.
   - `.card.card-pad-0` containing:
     - `.table-toolbar`: status pill buttons (All/Unread/Read with counts), type `<select className="select">` (info/success/warning/error), search input.
     - `.notif-list` with each `<div className="notif unread?">` row: type icon (kpi-icon-{color}), title `.t`, body `.d`, `.ts`, "New" badge if unread, delete X button.
   - Click row → `markRead(id)`. Clear all → `.modal-backdrop` confirm.
   - Polls `/api/notifications/unread-count` every 60s while page is focused.

4. **Sidebar wiring** — ensure these three routes are reachable from `Sidebar.jsx` and the user-menu dropdown in `AppLayout`.

## Acceptance criteria

- [ ] Profile edit + password change end-to-end, errors surfaced
- [ ] Settings sections save independently; AGENT sees only "My preferences"
- [ ] Notifications list renders, mark-read works, "mark all read" works
- [ ] Tabs/filters work on Notifications
- [ ] All three pages use leadpro CSS classes; no shadcn imports introduced
- [ ] No console errors

## AI prompt template

> I'm on task S4-FE-A-04. Read the manager's `Profile.jsx`, `Settings.jsx`, `Notifications.jsx` for layout intent, then the BE contracts listed in this task. Wire all three pages to real APIs using shadcn primitives. Show me which sections in Settings are role-gated and how you'll structure the role check before writing.

## Static UI reference (updated 2026-05-12)

- **Source of truth:** `leadpro-realty/src/pages/{Profile,Settings,Notifications}.jsx` — port directly.
- **Classes:** leadpro CSS. No shadcn. Modals via `.modal-backdrop` + `.modal`.
- **State:** `useAuthStore` (profile), `useSettingsStore` + `companyService`, `useNotificationsStore` + `notificationService`. Toasts: project's existing toast helper (no new dep).
- **Theme:** dark/light controlled via `.dark` class on `<html>`, persisted in localStorage. Toggle lives in Settings → Appearance and the topbar.

## Notes for reviewer

- AGENT must NOT see the company section (server returns 403 too — UI gate first).
- Avatar upload can be data-URL preview only if BE upload endpoint isn't ready — mark TODO with the linked BE task and don't block.
