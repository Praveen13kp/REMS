> **Updated 2026-05-12:** The leadpro static UI (`leadpro-realty/src/pages/AddLead.jsx`, `Leads.jsx`, `LeadDetail.jsx`, `Assign.jsx`) is now the FE source of truth. Confirm the Lead model carries every field the UI displays. **Schema additions required before this task closes** (add a follow-up migration if not already in place):
> - `priority` — String (`Hot` | `Warm` | `Cold`), nullable, default null. Surfaced as a badge in `Leads.jsx` and used as a filter and in `Assign.jsx`.
> - `nextFollowUpAt` — DateTime?, shown on `LeadDetail.jsx`.
> - `possessionTimeline` — String?, used by `AddLead.jsx` (`Immediate`, `Within 3 months`, etc.).
> - Confirm `score` (Int?) and `lastContactedAt` (DateTime?) are present — they are in the current schema.
> - `budget` stays a String (the leadpro form uses preset range strings like `₹50 L - ₹1 Cr`).
>
> The list/get/create/update endpoints must accept and return these fields. The list `sort` whitelist should also allow `priority:desc`, `score:desc`, and `nextFollowUpAt:asc` because `Leads.jsx` and `Assign.jsx` sort by them. The default response from `GET /api/leads/:id` should include `priority`, `score`, `nextFollowUpAt`, `lastContactedAt`, `possessionTimeline`, `tags`, and `notes` (rendered inline in the leadpro detail card).

# S2-BE-B-01 — Lead CRUD endpoints

**Owner:** BE-B
**Branch:** `be/lead/S2-BE-B-01-crud`
**Estimated:** 1 day
**Blocks:** S2-FE-B-01, S2-BE-B-02 (dedup), S2-BE-B-03 (assign)
**Blocked by:** S1-BE-B-01, S0-BE-A-04

## Goal

Build the core Lead module: create, list with filters, get-by-id, update, delete. Tenant-scoped via `req.tenantPrisma`.

## Files to read first

- `backend/prisma/schema.prisma` (Lead model)
- `backend/src/modules/lead/*` (existing skeleton)
- `backend/src/modules/project/*` (as a structural reference)
- `docs/design/lead-module.md` (from S0-BE-B-01)

## Steps

### 1. Replace skeleton — `backend/src/modules/lead/`

- `lead.routes.js`
- `lead.controller.js`
- `lead.service.js`
- `lead.validation.js`

### 2. Endpoints (all `/api/leads`, all authenticated)

- `GET /` — list. Query: `search`, `status`, `assignedToId`, `source`, `interestedProjectId`, `tag`, `city`, `page`, `pageSize`, `sort` (one of `createdAt:desc`, `createdAt:asc`, `updatedAt:desc`, `name:asc`). Returns `{ items, total, page, pageSize }`.
  - **Role-based default scoping:** AGENTs see only `assignedToId === me`; OWNER/ADMIN/MANAGER see all.
- `POST /` — body: `{name, phone, email?, source?, requirementType?, budget?, city?, interestedProjectId?, notes?, tags?, assignedToId?}`. Defaults `status: NEW`, `assignedToId: req.user.id` (creator owns it unless explicitly set).
- `GET /:id` — single lead with `assignedTo`, `interestedProject`, and `_count.{activities, notes, files, tasks}` for the lead-detail page's tab badges. (Counts for `notes`/`files`/`tasks` resolve to 0 until those modules land — keep the include shape stable so FE doesn't need to branch.)
- `PATCH /:id` — partial update. Status changes go through a separate endpoint (`/transition` in S3-BE-B-02), so reject `status` here.
- `DELETE /:id` — OWNER/ADMIN only.

### 3. Validation

zod schemas in `lead.validation.js`. Phone: 10–15 digits, normalize to E.164-ish (strip spaces/dashes). Email: optional but if present, valid format.

### 4. Service notes

- Use `req.tenantPrisma.lead.findMany({where, orderBy, skip, take, include: {...}})`
- For AGENT scoping, build the `where` dynamically: `{ ...filters, assignedToId: role === "AGENT" ? req.user.id : filters.assignedToId }`
- Searching by `?search=foo` ORs across `name`, `email`, `phone` with `contains` (case-insensitive)

### 5. Mount

```js
router.use("/leads", require("../modules/lead/lead.routes"));
```

## Acceptance criteria

- [ ] Five endpoints implemented
- [ ] AGENT can only see their own leads
- [ ] PATCH rejects `status` field with 400 + clear message
- [ ] Search works on name/email/phone
- [ ] Filters compose correctly (multiple at once)
- [ ] Pagination correct (`total` matches without filters)
- [ ] curl examples in `backend/AUTH.md`

## AI prompt template

> I'm on task S2-BE-B-01. Read this spec, `docs/design/lead-module.md`, `backend/prisma/schema.prisma`, `backend/src/modules/lead/`, and `backend/src/modules/project/` for structural reference. Build lead CRUD. Show me the zod schema and the where-builder for the list endpoint first.

## Notes for reviewer

- The AGENT scoping must be enforced server-side, not just by filter param
- `status` must NOT be updatable via PATCH — verify with a test
