# S0-FE-B-01 — Prep: read codebase, sketch Kanban + Lead List, write component plan

**Owner:** FE-B
**Branch:** `fe/docs/S0-FE-B-01-component-plan`
**Estimated:** 0.5 day
**Blocks:** S2-FE-B-01, S3-FE-B-02
**Blocked by:** none

## Goal

Sprint 0 has FE-A doing the shell. While that lands, FE-B reads the FE codebase, browses shadcn examples, and writes a component plan for Lead List, Lead Detail, and the Kanban board so Sprint 2/3 implementation is fast.

## Files to read first

- Every file under `frontend/src/`
- `frontend/components.json` (shadcn config)
- shadcn `data-table` example: https://ui.shadcn.com/docs/components/data-table
- The SOW sections 7.4, 7.5
- `docs/design/lead-module.md` (will land from S0-BE-B-01 — coordinate with BE-B)

## Steps

1. **Read** the entire frontend codebase and inventory which shadcn components are already installed (look at `frontend/src/components/ui/`).
2. **Sketch** (paper or Figma — your call) wireframes for:
   - Lead List page: filter bar, table with columns, pagination, bulk-action toolbar, "New Lead" button
   - Lead Detail page: left summary card, right tabbed area (Activity / Notes / Tasks)
   - Kanban board: 7-column horizontal scroll, lead card design, drag-drop affordance
3. **Write** `docs/design/frontend-components.md` listing:
   - All new components to be built (path, prop interface as JSDoc, parent-page)
   - Which existing shadcn primitives each one uses (`Table`, `Card`, `Dialog`, etc.)
   - Drag-drop library recommendation: pick one (e.g. `@dnd-kit/core` or `react-beautiful-dnd`); justify briefly
   - Form patterns: `react-hook-form` + `zod` resolver + shadcn `Form` components (we'll need the shadcn `form.tsx` — install in this PR via `npx shadcn@latest add form`)
4. Attach wireframe images (or Figma link) into the doc so reviewers can see what you're building toward.

## Acceptance criteria

- [ ] `docs/design/frontend-components.md` exists with prop signatures and primitive mapping
- [ ] Drag-drop library is chosen and committed (added to `package.json`)
- [ ] Wireframes attached or linked
- [ ] shadcn `form` primitive installed if not already

## AI prompt template

> I'm on task S0-FE-B-01. Read everything under `frontend/src/` and inventory installed shadcn components. Read `docs/design/lead-module.md` if it exists; if not, tell me. Write `docs/design/frontend-components.md` per the task spec. Recommend a drag-drop library — give me 2 options with tradeoffs, then your pick. Don't write any actual page components; that's Sprint 2/3.

## Notes for reviewer

- This is design, not code — the only `package.json` changes are the drag-drop lib and possibly shadcn primitives
- The component plan is reference material; we're not committing to every prop perfectly
