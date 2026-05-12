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
