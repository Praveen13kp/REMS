# S3-BE-B-01 — Pipeline stages API (per-tenant)

**Owner:** BE-B
**Branch:** `be/pipeline/S3-BE-B-01-stages`
**Estimated:** 0.5 day
**Blocks:** S3-FE-B-02 (Kanban needs stages), S2-FE-A-01's pipeline preview can switch from constant to API
**Blocked by:** S0-BE-A-04, S1-BE-A-01

## Goal

Each company has its own list of `PipelineStage` rows (seeded on registration). MVP exposes read + reorder; full CRUD/customization is a stretch goal.

## Steps

### 1. Module — `backend/src/modules/pipeline/`

- `pipeline.routes.js`
- `pipeline.controller.js`
- `pipeline.service.js`
- `pipeline.constants.js` — already exists from S1-BE-A-01

### 2. Endpoints

- `GET /api/pipeline/stages` — authenticated, returns the company's stages ordered by `order` ASC.
- `PATCH /api/pipeline/stages/reorder` — OWNER/ADMIN only. Body: `{stageIds: string[]}`. Updates `order` field for each.
- `PATCH /api/pipeline/stages/:id` — OWNER/ADMIN. Allows renaming (`name`) and adjusting `probability`. Cannot toggle `isWon`/`isLost` (system flags).

(Stretch / out of MVP: add/remove stages. Document as TODO.)

### 3. Validation

- Reorder must include all current stage IDs (no missing, no extras).
- Stage name unique within company.

## Acceptance criteria

- [ ] GET returns ordered list
- [ ] Reorder persists and is reflected in next GET
- [ ] PATCH on individual stage works
- [ ] curl examples

## AI prompt template

> I'm on task S3-BE-B-01. Read `docs/design/pipeline-module.md`, `backend/src/modules/pipeline/pipeline.constants.js`, and `backend/prisma/schema.prisma` (PipelineStage model). Build the three endpoints. The reorder endpoint should be a single transaction. Show me the validation logic first.
