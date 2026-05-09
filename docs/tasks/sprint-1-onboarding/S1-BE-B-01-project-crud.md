# S1-BE-B-01 — Project (Property) CRUD

**Owner:** BE-B
**Branch:** `be/project/S1-BE-B-01-crud`
**Estimated:** 1 day
**Blocks:** S1-FE-B-01, S2-BE-B-01 (lead → project relation)
**Blocked by:** S0-BE-A-03, S0-BE-A-04

## Goal

Companies can manage their list of projects/properties. MVP shape: name, location, type, price range, description, RERA number, possession date, cover image URL. No towers/floors/units yet — that's a later phase.

## Files to read first

- `backend/prisma/schema.prisma` (Project model)
- `backend/src/lib/tenantPrisma.js`
- `backend/src/modules/auth/auth.routes.js` (for module structure example)
- `docs/design/lead-module.md` (interestedProjectId reference)
- The SOW section 7.2

## Steps

### 1. Module — `backend/src/modules/project/`

- `project.routes.js`
- `project.controller.js`
- `project.service.js`
- `project.validation.js`

### 2. Endpoints (all under `/api/projects`, all authenticated, all use `req.tenantPrisma`)

- `GET /` — list projects. Query: `?search=&type=&page=1&pageSize=20`. Returns `{ items, total, page, pageSize }`.
- `POST /` — OWNER/ADMIN/MANAGER. Body: `{name, location, type, priceRange?, description?, reraNumber?, possessionDate?, coverImageUrl?}`.
- `GET /:id` — any authenticated user (in same company; tenant guard handles it).
- `PATCH /:id` — OWNER/ADMIN/MANAGER. Same shape as POST, all optional.
- `DELETE /:id` — OWNER/ADMIN only. Soft-delete is overkill for MVP — hard delete is fine, but **block deletion if any Lead has `interestedProjectId === this.id`** (return 409 with the count).

### 3. Validation

- `name` 2–120 chars
- `type` enum: `RESIDENTIAL`, `COMMERCIAL`, `PLOT`, `VILLA`, `MIXED` — add as Prisma enum if not yet present (coordinate with BE-A for the schema change)
- `possessionDate` must be a valid ISO date string

### 4. Service notes

- All queries use `req.tenantPrisma.project.*` — no manual companyId filter needed once tenantPrisma is in
- For the count check on DELETE, query `req.tenantPrisma.lead.count({ where: { interestedProjectId: id } })`

### 5. Mount in `routes/index.js`

```js
router.use("/projects", require("../modules/project/project.routes"));
```

## Acceptance criteria

- [ ] Five endpoints implemented and tested
- [ ] Unauthenticated requests return 401
- [ ] AGENT cannot create/edit/delete projects (returns 403)
- [ ] Cross-tenant access impossible (verified by creating a project in Company A, then trying to GET it as a Company B user)
- [ ] Deletion blocks when leads reference the project
- [ ] curl examples in `backend/AUTH.md`

## AI prompt template

> I'm on task S1-BE-B-01. Read `docs/tasks/sprint-1-onboarding/S1-BE-B-01-project-crud.md`, `backend/prisma/schema.prisma`, `backend/src/lib/tenantPrisma.js`, and `backend/src/modules/auth/auth.routes.js` as a structural example. Build the project module. The Prisma `Project.type` enum needs to be added — coordinate with BE-A by leaving a comment in your PR; for now add it to schema in this PR with a heads-up note. Show me the validation schema first.

## Notes for reviewer

- Confirm tenant isolation by manually testing cross-company access
- The DELETE-blocked-by-leads check must run BEFORE the delete query
