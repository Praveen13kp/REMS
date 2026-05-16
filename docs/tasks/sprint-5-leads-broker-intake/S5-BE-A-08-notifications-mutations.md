# S5-BE-A-08 — Notifications mark-read / delete endpoints

**Owner:** BE dev
**Branch:** `be/notification/S5-BE-A-08-mutations`
**Estimated:** 0.25 day
**Blocks:** —
**Blocked by:** —

## Goal

`admin/Notifications.jsx` is currently local-state-only. Wire the mutations to the BE.

## Steps

1. `PATCH /api/notifications/:id` — body `{ read: true }`
2. `PATCH /api/notifications/mark-all` — body `{}`
3. `DELETE /api/notifications/:id`
4. `DELETE /api/notifications` — clear all
5. All scoped to the calling user (not tenant — notifications are per-user).

## Acceptance criteria

- [ ] All 4 endpoints work
- [ ] FE removes its local-only TODO comments
- [ ] Marking read updates the unread badge in the layout
