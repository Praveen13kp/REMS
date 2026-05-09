# S0-BE-B-01 — Prep: read codebase, write Lead/Pipeline design doc

**Owner:** BE-B
**Branch:** `be/docs/S0-BE-B-01-design-doc`
**Estimated:** 0.5 day
**Blocks:** S2-BE-B-01, S2-BE-B-02, S3-BE-B-01
**Blocked by:** none (can run parallel to S0-BE-A-* tasks)

## Goal

Sprint 0 is mostly BE-A work. While that's in flight, BE-B reads the codebase end-to-end and writes a design doc for the Lead and Pipeline modules so Sprint 2/3 can move fast.

## Files to read first

- Every file under `backend/src/`
- `backend/prisma/schema.prisma`
- The SOW sections 7.3, 7.4, 7.5, 7.6, 7.7
- `docs/CONTRIBUTING.md`

## Steps

1. **Read** the entire backend codebase. Make notes on what's there and what's not.
2. **Write** `docs/design/lead-module.md` covering:
   - Lead lifecycle (the 9 stages from SOW section 8 — but only the 7 core MVP stages: New, Contacted, Qualified, Site Visit Scheduled, Site Visit Done, Negotiation, Booked, Closed Won, Closed Lost)
   - All API endpoints we'll build for leads (`GET /leads`, `POST /leads`, `GET /leads/:id`, `PATCH /leads/:id`, `DELETE /leads/:id`, `POST /leads/:id/assign`, `POST /leads/:id/transition`, `GET /leads/:id/activity`, `POST /leads/import`)
   - Request/response shapes for each (sketch JSON examples)
   - Dedup algorithm — exact match on phone OR email; fuzzy match by name+city as a soft warning
   - Assignment rules — manual only for MVP (round-robin/source-based deferred to post-MVP)
3. **Write** `docs/design/pipeline-module.md` covering:
   - PipelineStage model usage (per-tenant stages, default seeded set, customizable later)
   - Status transition validation (allowed-from-to map; non-MVP: stage entry/exit criteria)
   - Activity log integration — every transition writes an Activity row of type `STATUS_CHANGE`
   - Kanban payload shape (one fetch returns stages + leads-grouped-by-stage)
4. **Open a PR** with just these two markdown files. The point is to get FE-B and BE-A to review the API shapes BEFORE you start coding in Sprint 2.

## Acceptance criteria

- [ ] Both design docs exist and are clear enough that FE-B can sketch UIs from them without ambiguity
- [ ] All endpoint shapes are JSON-spec'd
- [ ] Dedup rule is explicit
- [ ] Activity-on-transition rule is explicit

## AI prompt template

> I'm on task S0-BE-B-01. Read every file under `backend/src/`, `backend/prisma/schema.prisma`, and the SOW sections 7.3–7.7 (ask me for the SOW text if you can't read .docx). Then write `docs/design/lead-module.md` and `docs/design/pipeline-module.md` per the task spec. These are design docs, not code — focus on API shape, dedup logic, and the lifecycle. Show me an outline before writing the full docs.

## Notes for reviewer

- Watch for over-engineering — MVP scope only
- The dedup rule needs to be deterministic and documented; future tasks rely on it
