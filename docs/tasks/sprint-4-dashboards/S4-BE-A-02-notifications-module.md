# S4-BE-A-02 — Notifications module

> **Updated 2026-05-12:** Verified against `leadpro-realty/src/pages/Notifications.jsx`. **UI uses 4 type values**: `info | success | warning | error` (drives icon + color). Spec uses semantic types like `LEAD_ASSIGNED`. Decision: keep `type` semantic on backend, **add a derived `severity` field** (`info | success | warning | error`) or let FE map `type→severity` via lookup. Either is fine — pick one and document. Leadpro also expects:
> - `unreadCount` and `readCount` available cheaply (UI shows pill counts `All N / Unread N / Read N`). Existing `/unread-count` covers half; consider a single `GET /counts` returning both.
> - `DELETE /:id` — leadpro's UI **does** support delete (lines ~30, 76 — `remove(id)` removes per-row). The original spec marked DELETE as "optional / not in MVP". **Promote DELETE to required.**
> - `DELETE /` (clear all) — leadpro has "Clear all" button. **Add `DELETE /api/notifications` to clear all for current user.**
> - Filter by status (all/unread/read) and by type — existing `filter=` query supports this, but `type` values should match the 4 severity values FE sends.

**Owner:** BE-A
**Branch:** `be/notification/S4-BE-A-02-module`
**Estimated:** 0.5 day
**Blocks:** S4-FE-A-04
**Blocked by:** S0-BE-A-03, S0-BE-A-04

## Goal

In-app notification inbox. Tenant-scoped, per-user. Other modules emit notifications via a small helper; this task ships the model, helper, and read API.

## Schema additions (`backend/prisma/schema.prisma`)

```prisma
model Notification {
  id          String   @id @default(cuid())
  companyId   String
  userId      String   // recipient
  type        String   // LEAD_ASSIGNED | LEAD_STATUS_CHANGED | NOTE_MENTION | SYSTEM | etc.
  title       String
  body        String?
  link        String?  // e.g. /leads/<id>
  readAt      DateTime?
  metadata    Json?
  createdAt   DateTime @default(now())

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@index([userId, readAt])
}
```

Migration: `notifications_init`.

## Endpoints under `/api/notifications`

- `GET /?filter=all|unread|mentions|system&page=&pageSize=` — list, newest first; `total` + items
- `GET /unread-count` — `{ count }` (cheap; FE polls this)
- `PATCH /:id/read` — mark single
- `PATCH /read-all` — mark all unread as read for current user
- `DELETE /:id` — delete single (REQUIRED — leadpro UI uses this)
- `DELETE /` — clear all notifications for current user (REQUIRED — "Clear all" button)
- `GET /counts` — `{ all, unread, read }` for filter pills

## Helper

`backend/src/modules/notifications/notify.js`:

```js
export async function notify(tenantPrisma, { userId, type, title, body, link, metadata }) { ... }
```

Wire one obvious call site to prove it: `notify()` on lead assignment (from S2-BE-B-03) — type `LEAD_ASSIGNED`. Other call sites added later as needed.

## Acceptance criteria

- [ ] Migration applies cleanly
- [ ] All 4 endpoints work, tenant-scoped (user can only see their own notifications)
- [ ] `notify()` helper writes a row and is called on lead assignment
- [ ] `GET /unread-count` returns the right number
- [ ] curl examples in the PR

## AI prompt template

> I'm on task S4-BE-A-02. Read `backend/prisma/schema.prisma`, the tenantPrisma helper from S0-BE-A-03, and the activity helper from S3-BE-A-01 for style. Add the Notification model, the notify() helper, the 4 endpoints, and wire the lead-assignment call site. Keep it small.

## Notes for reviewer

- `notify()` should be fire-and-forget — never block the caller. Log on failure, don't throw.
- Don't ship email/push fan-out yet — that's a future task.
