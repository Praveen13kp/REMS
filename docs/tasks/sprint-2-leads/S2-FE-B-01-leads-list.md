# S2-FE-B-01 — Leads list page (table, filters, pagination)

**Owner:** FE-B
**Branch:** `fe/lead/S2-FE-B-01-list`
**Estimated:** 1 day
**Blocks:** S2-FE-B-02, S3-FE-B-01, S3-FE-B-02
**Blocked by:** S0-FE-A-02, S2-BE-B-01

## Goal

The Leads page is the workhorse view. Build the list/table view first; Kanban comes in S3.

## Files to read first

- `frontend/src/pages/admin/Leads.jsx` (placeholder)
- Backend endpoint: `GET /api/leads` from `docs/tasks/sprint-2-leads/S2-BE-B-01-lead-crud.md`
- `docs/design/frontend-components.md`
- `frontend/src/components/ui/{table,badge,button,input,select,popover}.jsx`

## Steps

1. **`useLeads` hook** — `frontend/src/hooks/useLeads.js` (replace stub):
   - Accepts a `params` object (search, status, assignedToId, etc.)
   - Returns `{ data, total, isLoading, error, refetch }`
   - Debounced search input (use existing `useDebounce`)

2. **Page layout**:
   - Header with title + "New Lead" button (opens dialog from S2-FE-B-02)
   - Tab strip: "All Leads" / "My Leads" (changes the `assignedToId` filter)
   - Filter bar: search input, status dropdown (multi), source filter, assigned-to filter, project filter
   - Active filter chips below the bar with X to remove
   - Table:
     - Columns: Checkbox, Name, Phone, Status (colored Badge), Source, Assigned To, Project, Created, Actions
     - Click row → navigate to `/leads/:id` (page from S3-FE-B-01; for now route there with placeholder)
     - Sort by clicking column header
   - Bulk action bar appears when rows selected: Assign, Tag, Delete, Export (only Assign and Delete are wired; the rest stub)
   - Pagination footer: total + Prev/Next + page-size select (10/25/50)
   - Empty state with friendly icon

3. **Status badge colors** — define a map in `lib/constants.js`:
   ```
   NEW: gray, CONTACTED: blue, QUALIFIED: indigo, SITE_VISIT_SCHEDULED: violet,
   SITE_VISIT_DONE: purple, NEGOTIATION: amber, BOOKED: green, CLOSED_WON: emerald, CLOSED_LOST: red
   ```

4. **Bulk delete** — calls DELETE one-by-one (no bulk endpoint MVP); show progress, then refetch.

5. **Bulk assign** — opens dialog with user dropdown; calls `POST /api/leads/bulk-assign`.

## Acceptance criteria

- [ ] Table renders with all columns
- [ ] Filters compose correctly and reset works
- [ ] Pagination works with `total` from API
- [ ] Bulk select + bulk assign + bulk delete work
- [ ] AGENT auto-sees only their leads (server enforces, client doesn't need to)
- [ ] Empty state shown
- [ ] No console errors

## AI prompt template

> I'm on task S2-FE-B-01. Read `frontend/src/pages/admin/Leads.jsx` (current placeholder), `frontend/src/hooks/useLeads.js`, the backend `GET /api/leads` contract from `docs/tasks/sprint-2-leads/S2-BE-B-01-lead-crud.md`, and `docs/design/frontend-components.md`. Build the leads page with shadcn Table + filters + bulk actions. Show me the filter bar component layout and the URL-state strategy (do filters live in URL params? If yes, use react-router's useSearchParams). I prefer URL params so filters survive refresh.

## Notes for reviewer

- URL-as-state for filters is the right call here
- Don't build the create dialog in this PR — that's S2-FE-B-02

## Static UI reference (updated 2026-05-12 — supersedes the 2026-05-10 note below)

> **Updated 2026-05-12:** Initial table view already shipped (commit ea2d0b6). The leadpro static UI is now the source of truth and shadcn primitives are NOT used in ported pages. Port `leadpro-realty/src/pages/Leads.jsx` 1:1 (layout, classes, behaviors) and add the card-grid toggle below.

- **Source page:** `leadpro-realty/src/pages/Leads.jsx`.
- **Markup/classes (leadpro CSS, already in `frontend/src/styles/leadpro.css`):** wrapper `.table-wrap`, toolbar `.table-toolbar`, search `.topbar-search`, raw `<table className="data">`, footer `.table-foot`, `.pagination`. Buttons `.btn .btn-primary` / `.btn-secondary` / `.btn-ghost` / `.btn-icon`. Badges `.badge`, plus `statusCls(status)` and `priorityCls(priority)` helpers in `frontend/src/lib/format.js`. Form controls `.input`, `.select`. Empty state `.empty-state`.
- **Do NOT use:** shadcn `Table`, `Badge`, `Input`, `Select`, `Popover`, `Checkbox`, `Dialog`. Use raw HTML elements with leadpro classes.
- **Columns to render (matches leadpro):** checkbox, Customer (avatar + name + email), Phone, Project, Budget (`fmt.inr`), Source, Status badge, Priority badge, Assigned Agent (avatar + first name), row actions (View / Edit / Delete icons).
- **Bulk actions:** show toolbar segment when `selected.size > 0` with Assign + Delete (Tag / Export stubbed). Bulk-assign opens a leadpro `.modal-backdrop` + `.modal` (NOT shadcn `Dialog`).
- **Card-grid view (new, on top of leadpro):** add a "Table / Cards" toggle in the toolbar; the cards view renders `.lead-card-grid` with `.lead-card` items showing the same fields. Persist the chosen view in localStorage.
- **Filters:** search, status, priority, source, assignedTo, project. URL-as-state via `useSearchParams` so filters survive refresh.
- **State:** zustand `useLeadStore` + `services/leadService.js`. Backend enforces AGENT visibility — do NOT filter client-side by role.
- **Helpers:** `fmt.*`, `priorityCls`, `statusCls`, `roleLabel` from `frontend/src/lib/format.js`.
- **Icons:** lucide-react (same icon set leadpro uses).
- **Theme:** light default; `.dark` class on `<html>` toggles dark.
