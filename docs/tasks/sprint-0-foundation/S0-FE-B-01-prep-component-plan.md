# S0-FE-B-01 — Prep: read codebase, sketch Lead List + Lead Detail + Kanban, write component plan

> **Updated 2026-05-12:** The component plan now references **`leadpro-realty/` pages** as the source of truth (not shadcn primitives). FE-B's plan is a port-map: for each Sprint 2/3 FE-B page, identify the corresponding leadpro page and the leadpro CSS classes / sub-components it uses. No shadcn `Table` / `Dialog` / `Form` mapping — use leadpro classes (`.card`, `.modal-backdrop`, `.input`, `.select`, `.textarea`) and raw `<table>` / `<form>` markup. Forms still use `react-hook-form` + `zod`. Drag-drop library pick is still in scope for Kanban (S3-FE-B-02).

**Owner:** FE-B
**Branch:** `fe/docs/S0-FE-B-01-component-plan`
**Estimated:** 0.5 day
**Blocks:** S2-FE-B-01, S3-FE-B-02
**Blocked by:** none

## Goal

Sprint 0 has FE-A doing the shell wire-up. While that lands, FE-B reads the FE codebase, reads the leadpro reference pages, and writes a component plan for Lead List, Lead Detail, and the Kanban board so Sprint 2/3 implementation is fast.

## Files to read first

- Every file under `frontend/src/`
- `frontend/src/styles/leadpro.css` — the class library
- Leadpro reference pages (source of truth):
  - `leadpro-realty/src/pages/Leads.jsx` — Lead List
  - `leadpro-realty/src/pages/LeadDetail.jsx` — Lead Detail
  - `leadpro-realty/src/pages/AddLead.jsx` and `LeadEdit.jsx` — Lead form
  - `leadpro-realty/src/pages/Assign.jsx` — Assignment UI
- The SOW sections 7.4, 7.5
- `docs/design/lead-module.md` (will land from S0-BE-B-01 — coordinate with BE-B)

## Steps

1. **Read** the entire frontend codebase and confirm what's already ported (layouts, leadpro.css, format helpers). Note which leadpro pages have NOT been ported yet.
2. **Read** the leadpro reference pages for Leads, LeadDetail, AddLead, LeadEdit, Assign. Note the components leadpro uses internally (e.g., its own `Modal`, `Tabs`, badge classes) — these are what we'll mirror with `.modal-backdrop` / `.tabs` / `.badge-*` markup.
3. **Sketch** (optional — leadpro pages already show the design) brief port notes for:
   - **Lead List page** — filter bar, table with columns, pagination, bulk-action toolbar, "New Lead" button. Reference: `leadpro-realty/src/pages/Leads.jsx`. Use leadpro classes; render the table as `<table class="lp-table">` or whatever leadpro uses; replace `useApp()` reads with `useLeadStore` + axios.
   - **Lead Detail page** — left summary card, right tabbed area (Activity / Notes / Tasks / Files). Reference: `leadpro-realty/src/pages/LeadDetail.jsx`. Use leadpro `.card` + `.tabs` markup.
   - **Kanban board** — 7-column horizontal scroll, lead card design, drag-drop affordance. Leadpro does NOT have a Kanban — design it using leadpro's `.card` / `.badge-*` classes for consistency.
4. **Write** `docs/design/frontend-components.md` listing:
   - For each Sprint 2/3 page: the leadpro reference file, the leadpro CSS classes used, and the state shape needed from our zustand stores
   - New shared components to extract (e.g., a `LeadCard.jsx` used in both list rows and Kanban cards) — render with leadpro classes, no shadcn
   - Drag-drop library recommendation for Kanban: pick one (`@dnd-kit/core` recommended; `react-beautiful-dnd` is unmaintained) and justify briefly
   - Form patterns: `react-hook-form` + `zod` resolver; inputs render as `<input class="input">`, `<select class="select">`, `<textarea class="textarea">` — **NOT** shadcn `<Input>` / `<Select>` / `<Form>` components
   - Modals: use leadpro `.modal-backdrop` + `.modal` markup, **NOT** shadcn `Dialog`
5. Attach wireframe screenshots from leadpro (run leadpro-realty locally and screenshot, or link to its pages in the doc).

## Acceptance criteria

- [ ] `docs/design/frontend-components.md` exists; for each Sprint 2/3 FE-B page it lists the leadpro reference file + classes
- [ ] Drag-drop library is chosen and added to `frontend/package.json`
- [ ] Wireframes / leadpro screenshots attached or linked
- [ ] **No** mention of shadcn `Table` / `Dialog` / `Form` primitives in the doc
- [ ] **No** new shadcn primitives installed in this PR

## AI prompt template

> I'm on task S0-FE-B-01. Read everything under `frontend/src/`, `frontend/src/styles/leadpro.css`, and the leadpro reference pages at `leadpro-realty/src/pages/{Leads,LeadDetail,AddLead,LeadEdit,Assign}.jsx`. Read `docs/design/lead-module.md` if it exists. Write `docs/design/frontend-components.md` per the task spec, referencing leadpro classes (NOT shadcn primitives) for every page. Recommend a drag-drop library — give me 2 options with tradeoffs, then your pick. Don't write any actual page components; that's Sprint 2/3.

## Notes for reviewer

- This is design, not code — the only `package.json` change is the drag-drop lib
- Reject the PR if it suggests shadcn `Dialog` / `Input` / `Select` / `Form` for any page — those are forbidden in ported leadpro pages
