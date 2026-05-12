# S3-FE-B-02 — Kanban board with drag-drop

> **WARNING — Divergence from leadpro-realty (2026-05-12):** leadpro-realty has **NO kanban page**. The static UI source of truth contains no reference for this view. TL to decide:
> 1. **Keep as extension beyond leadpro scope** — proceed with the spec below, design the LeadCard from scratch using leadpro classes (`.card`, `.badge`, `.avatar`).
> 2. **Drop from MVP** — rely on the dashboard stage breakdown + filterable leads list.
>
> Default recommendation: **drop from MVP** until manager provides a static Kanban page or the team accepts an in-house design.
>
> **If kept**, the stack rules below apply.

## Stack rules (if this task proceeds)

- **Styling:** leadpro CSS classes — `.card`, `.badge`, `.badge-muted`, `.avatar`, `.row`, `.stack`, `.kpi-grid` for column layout. NOT shadcn primitives.
- **Modals:** leadpro `.modal-backdrop` + `.modal` for the lost-reason prompt. NOT shadcn `Dialog`.
- **Forms:** react-hook-form + zod for the reason input; `.input` class.
- **Theme:** light default; dark via `.dark`.
- **Icons:** lucide-react.
- **View toggle:** plain buttons styled with `.btn` / `.btn-secondary` (no shadcn `Tabs`).
- **Drag-drop:** `@dnd-kit/core` headless — only the inner LeadCard renders with leadpro classes.


**Owner:** FE-B
**Branch:** `fe/pipeline/S3-FE-B-02-kanban`
**Estimated:** 1 day
**Blocks:** —
**Blocked by:** S3-BE-B-03, S3-BE-B-02

## Goal

The leads page gets a view toggle (Table | Kanban). Kanban shows leads grouped by stage, drag-drop between columns calls the transition endpoint.

## Files to read first

- `frontend/src/pages/admin/Leads.jsx` (from S2-FE-B-01)
- Backend: `GET /api/pipeline/board`, `POST /api/leads/:id/transition`
- Drag-drop library docs (from `docs/design/frontend-components.md` — likely `@dnd-kit/core`)

## Steps

1. **View toggle** in `Leads.jsx` header: "Table" / "Kanban" tabs. Persist in URL param `?view=kanban`.

2. **`KanbanBoard` component** — `frontend/src/components/leads/KanbanBoard.jsx`:
   - Fetches `/api/pipeline/board` with current filters
   - Renders horizontal-scroll row of columns (one per stage)
   - Each column: header (name + count), scrollable body of LeadCards
   - Empty column shows "No leads" placeholder

3. **`LeadCard` component** — `frontend/src/components/leads/LeadCard.jsx`:
   - Compact card: name, phone (small), source badge, days-since-created, score (if set), assignedTo avatar
   - Click → navigate to `/leads/:id`

4. **Drag-drop**:
   - Use `@dnd-kit/core` (Sortable for cards within a column, plus cross-column).
   - On drop, optimistically move the card, then call `POST /api/leads/:id/transition` with `toStatus: targetStage.name`.
   - On error: revert + toast.
   - If target column is `isLost`, prompt for reason via small dialog before sending.

5. **Performance**: with the 50-cap from backend, each column is light. Don't worry about virtualization yet.

## Acceptance criteria

- [ ] View toggle works and persists in URL
- [ ] Board renders all stages with correct counts
- [ ] Drag a card between columns triggers transition
- [ ] Lost-column drop asks for reason
- [ ] Optimistic update + revert on error
- [ ] Filters from the leads page also apply to Kanban

## AI prompt template

> I'm on task S3-FE-B-02. Read `frontend/src/pages/admin/Leads.jsx`, `docs/design/frontend-components.md` (for drag-drop library decision), and the backend `GET /api/pipeline/board` and `POST /api/leads/:id/transition` contracts. Build KanbanBoard + LeadCard with @dnd-kit drag-drop. Show me the component tree and the drag handlers' state flow first; it's the trickiest part.

## Notes for reviewer

- Optimistic update has subtle bugs around id reuse — confirm cards don't disappear on error revert
- The "lost reason" mini-dialog should be light, not a modal interrupt

## Static UI reference (added 2026-05-11)

- **Layout reference:** The manager's zip does **not** include a Kanban view (his `Leads.jsx` is table-only). For card content/styling, mirror the row layout from his `Leads.jsx` (name + phone + status badge + assignee) compacted into a vertical card.
- **Restyle:** shadcn `Card` for `LeadCard`, `Badge` for status/source via `statusCls`/`priorityCls` from `lib/format.js`, `Avatar` for assignee, `Tabs` for the Table/Kanban view toggle, `Dialog` for the lost-reason prompt. Drag/drop wrappers stay headless — only the inner card uses shadcn primitives.
- **State:** reuse `useLeadStore` filters from S2-FE-B-01; board data via `pipelineService.getBoard()`. Toasts via `sonner`.
