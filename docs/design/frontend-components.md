# Frontend Components — Port Map & Design Notes

**Owner:** FE-B
**Updated:** 2026-05-12
**Status:** Source-of-truth for Sprint 2/3 FE-B port work. Reflects the codebase after the 2026-05-12 leadpro alignment (Phases 1–5).

This document is the per-page reference for porting leadpro-realty pages into `frontend/`. It is **not** a tutorial — it assumes you've read `docs/CONTRIBUTING.md` and the [README's Static-UI rules](../tasks/README.md). The rules in short:

- **Visual source of truth:** `leadpro-realty/src/pages/<PageName>.jsx`. Do not redesign.
- **Styling:** leadpro CSS classes from `frontend/src/styles/leadpro.css`. **No shadcn primitives** in ported pages.
- **State:** zustand store + `axios` `api` client. No `useApp()` Context.
- **Forms:** `react-hook-form` + `zod`. Inputs render as `<input className="input">` / `<select className="select">` / `<textarea className="textarea">`. **Not** shadcn `<Input>` / `<Select>` / `<Form>`.
- **Modals:** `.modal-backdrop` + `.modal` markup. **Not** shadcn `Dialog`.
- **Icons:** `lucide-react`.
- **Charts:** `chart.js` + `react-chartjs-2`. **Not** recharts.
- **Toasts:** `sonner` via `toast.success/info/error()`.

---

## Page port map

### Sprint 2 — Leads core

#### Lead List (`/leads` → `frontend/src/pages/admin/Leads.jsx`)

| Aspect | Detail |
|---|---|
| Leadpro reference | `leadpro-realty/src/pages/Leads.jsx` |
| Status | Ported in Phase 4 (2026-05-12); real API wired (GET /leads with filter/sort/page/bulk delete) |
| Leadpro classes | `.content-head`, `.kpi-grid` + `.kpi`, `.table-wrap`, `.table-toolbar`, `.table-scroll`, `table.data`, `.table-foot`, `.pagination`, `.badge` + `.badge-success/-warning/-error/-info/-muted/-hot/-warm/-cold`, `.lead-card-grid` (toggleable card view), `.btn` + variants, `.btn-icon`, `.row`, `.input`, `.select` |
| State (zustand) | `useLeadsStore` — pageable list, filters, selection set; OR keep the existing `useLeads(params)` hook reading from a server with URL state via `useSearchParams`. The current implementation uses the latter, which is fine. |
| Server endpoints | `GET /leads?page&pageSize&sort&search&status&source&assignedToId&interestedProjectId`, `GET /users`, `GET /projects`, `DELETE /leads/:id` (bulk: loop) |
| Forms in page | Inline filter bar only; no large form. |
| Modals in page | Bulk-delete confirm (leadpro modal). |
| Sub-components | `LeadStatusBadge`, `LeadPriorityBadge`, `LeadRow` (reuses `<tr>` markup inline — does NOT need extraction yet). |

#### Add Lead (`/leads/new` → `frontend/src/pages/admin/AddLead.jsx`)

| Aspect | Detail |
|---|---|
| Leadpro reference | `leadpro-realty/src/pages/AddLead.jsx` |
| Status | Ported in Phase 5; real API (POST /leads) wired; 409 dedup banner. |
| Leadpro classes | `.content-head`, `.card`, `.card-title`, `.field`, `.input`, `.select`, `.textarea`, `.req`, `.btn` variants, `.row row-between`. Section dividers via `border-top: 1px solid var(--lp-border)`. |
| Form library | `react-hook-form` + `zodResolver`. zod enums for `status` and `priority`. **`priority` is rendered but BE doesn't persist it yet** — see [Lead schema gap](#lead-schema-gaps). |
| State | Local form state only. |
| Server endpoints | `POST /leads` (handles 409 with `existingLead` reference); `GET /users`, `GET /projects?pageSize=100` for dropdowns. |
| Sub-components | Inline section headers (no extraction yet). |

#### Lead Edit (`/leads/:id/edit` → `frontend/src/pages/admin/LeadEdit.jsx`)

| Aspect | Detail |
|---|---|
| Leadpro reference | `leadpro-realty/src/pages/LeadForm.jsx` (same form as AddLead, prefilled) |
| Status | Ported in Phase 5; GET/PATCH /leads/:id wired. |
| Pattern | Identical to AddLead. The Status select merges seeded-stage names with the spec enum to handle existing data. |

#### Assign Leads (`/assign` → `frontend/src/pages/admin/Assign.jsx`)

| Aspect | Detail |
|---|---|
| Leadpro reference | `leadpro-realty/src/pages/Assign.jsx` |
| Status | Ported in Phase 5; manual reassign wired (PATCH /leads/:id); auto-distribute stubbed (no `POST /leads/auto-assign` yet). |
| Leadpro classes | `.content-head`, `.card`, `.card-title`, `.kpi-grid`, `.lead-card-grid`, `.lead-card`, `.tabs`, `.tab`, `.btn` variants, `.badge`. Agent workload progress bars use inline-styled `<div>` with `background: var(--lp-surface-2)` + filled bar `background: var(--lp-accent)`. |
| State | Local: selected leads set, picked agent. |
| Server endpoints needed (Sprint 2 BE-B-03) | `GET /leads?assignedToId=null` (or new `/leads/unassigned`), `GET /users`, `POST /leads/auto-assign`, `GET /users/workload`, `PATCH /leads/:id`. |

### Sprint 3 — Pipeline & activity

#### Lead Detail (`/leads/:id` → `frontend/src/pages/admin/LeadDetail.jsx`)

| Aspect | Detail |
|---|---|
| Leadpro reference | `leadpro-realty/src/pages/LeadDetail.jsx` |
| Status | Ported in Phase 5. Real API for status/reassign/delete; activity/notes/files tabs are placeholders. |
| Leadpro classes | `.grid` `grid-template-columns: 2fr 1fr` two-column, `.card`, `.card-title`, `.row`, `.badge` (clickable status), `.activity-item`, `.btn`, `.modal-backdrop` + `.modal` (for status change / reassign / delete confirm). |
| Diverges from leadpro | **No Activity/Notes/Tasks/Files tabs** — leadpro's LeadDetail is single-column-grid with a side panel. If Sprint 4 wants tabs, that's an extension; do not block on it. |
| Server endpoints | `GET /leads/:id`, `PATCH /leads/:id` (status, assignment, edits), `DELETE /leads/:id`. |
| Sub-components | `StatusChangeModal`, `ReassignModal`, `DeleteConfirmModal` — all inline using `.modal-backdrop` markup. |

#### Follow-Ups (`/follow-ups` → `frontend/src/pages/admin/FollowUps.jsx`)

| Aspect | Detail |
|---|---|
| Leadpro reference | `leadpro-realty/src/pages/FollowUps.jsx` |
| Status | Ported in Phase 5. Reads `lead.nextFollowUpAt` (falls back to `nextFollowUp`); buckets client-side into Today / Missed / Upcoming. |
| Leadpro classes | `.content-head`, `.card`, `.card-title`, `.activity-item`, `.row`, `.badge` (red for overdue), `.kpi` (count cards). |
| Diverges from leadpro | Leadpro uses the same approach — no separate Task table. Our Sprint 3 BE-B-04 spec proposes a Task table, which adds round trips. **Decide before BE-B-04 starts**: keep using `lead.nextFollowUpAt`, or back FollowUps with the Task table's `dueAt`. |
| Server endpoints | `GET /leads` (current); future: `GET /tasks?bucket=today` if Task table wins. |

#### Kanban Board (`/kanban` → not yet ported — Sprint 3 FE-B-02)

| Aspect | Detail |
|---|---|
| Leadpro reference | **Does not exist in leadpro-realty.** This page is a RELMS extension. Decide whether to keep in MVP scope. |
| If kept | Build with leadpro `.card`, `.lead-card`, `.badge`. Horizontal-scroll layout of 7 status columns from `PipelineStage` seed (normalized to 7 to match leadpro: `New, Contacted, Interested, Site Visit, Negotiation, Booked, Lost`). |
| Drag-drop library | **`@dnd-kit/core`** — see [Drag-drop](#drag-drop-library) below. |
| State | `useKanbanStore` with `{ columns: Record<stageId, Lead[]>, optimisticMove(leadId, fromStage, toStage) }`. |
| Server endpoints | `GET /kanban` (current spec S3-BE-B-03 returns stages with leads), `PATCH /leads/:id` `{ status }` for drops. |

### Sprint 4 — Dashboards & polish (FE-B owns 3)

#### Notes UI (lead-detail side panel)

| Aspect | Detail |
|---|---|
| Leadpro reference | **Not in leadpro.** Extension. |
| Pattern | `.card` panel inside LeadDetail's right column; `.activity-item` markup for each note; `<textarea className="textarea">` + `<button className="btn btn-primary btn-sm">Add note</button>`. |

#### CSV Import UI

| Aspect | Detail |
|---|---|
| Leadpro reference | **Not in leadpro.** Extension. |
| Leadpro classes | `.modal-backdrop` + `.modal` (multi-step wizard inside one big modal), `.dropzone` for file drop, `table.data` for the column-mapping preview. |

#### Files Page

| Aspect | Detail |
|---|---|
| Leadpro reference | `leadpro-realty/src/pages/Files.jsx` (table-only, no grid toggle) |
| Status | Ported in Phase 5. UI complete; `GET/POST/DELETE /files` stubbed (404 → local state). |
| Leadpro classes | `.content-head`, `.card`, `.table-wrap`, `table.data`, `.dropzone`, custom storage-quota bar (`var(--lp-surface-2)` track + `var(--lp-accent)` fill). |

---

## Shared components

These exist or should exist under `frontend/src/components/`. **All use leadpro classes, not shadcn.**

| Component | Location | Used by | Notes |
|---|---|---|---|
| `Modal` wrapper | inline pattern (no extraction yet) | every page with confirmation/edit dialogs | `.modal-backdrop` onClick close + `.modal` `e.stopPropagation()`. Extract to `components/common/Modal.jsx` only if it's used >5 times. Currently inlined. |
| `LeadCard` | TBD — extract during Kanban work if Kanban survives | Kanban columns, Assign page card-grid | Renders `.lead-card` markup: name, phone, project, status badge. Driven by a `Lead` prop. |
| `StatusBadge` | inline `<span className={\`badge \${statusCls(status)}\`}>` | Leads list, LeadDetail, FollowUps, Kanban | Helper `statusCls(status)` lives in `frontend/src/lib/format.js`. |
| `PriorityBadge` | same pattern as StatusBadge | Leads list, LeadDetail, AddLead | Helper `priorityCls(priority)` → `.badge-hot/-warm/-cold`. |
| `EmptyState` | `frontend/src/components/common/EmptyState.jsx` (already exists) | Any list page | Already uses `.empty-state` class. |
| `KpiCard` | inline pattern — no shared component | Dashboard, Leads, FollowUps, Reports, SuperAdmin | Markup is small (`<div className="kpi">...</div>`); extracting hurts more than helps. |
| `TableToolbar` | inline pattern | Leads, UsersMgmt, Projects, Files | `.table-toolbar` container with `.topbar-search` + filter selects + bulk-action buttons. |

**Rule of thumb for extraction:** if the same JSX block (with the same classes) appears in 3+ pages and varies only by data, extract. Otherwise inline. We've found that inline is faster to reason about for the simple cards.

---

## Form pattern

```jsx
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

const schema = z.object({
  name: z.string().min(1, "Required"),
  email: z.string().email("Invalid email"),
  priority: z.enum(["HOT", "WARM", "COLD"]),
})

export default function MyForm() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", priority: "WARM" },
  })

  const onSubmit = async (data) => { /* api.post(...) */ }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="stack">
      <div className="field">
        <label>Name <span className="req">*</span></label>
        <input className="input" {...register("name")} />
        {errors.name && (
          <div className="text-sm" style={{ color: "var(--lp-error)" }}>{errors.name.message}</div>
        )}
      </div>

      <div className="field">
        <label>Priority</label>
        <select className="select" {...register("priority")}>
          <option value="HOT">Hot</option>
          <option value="WARM">Warm</option>
          <option value="COLD">Cold</option>
        </select>
      </div>

      <div className="row row-between">
        <button type="button" className="btn btn-ghost">Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  )
}
```

**Server-side errors** (zod-validation 400s from BE):

```jsx
try {
  await api.post("/leads", data)
} catch (err) {
  if (err.status === 409 && err.fields) {
    // map per-field errors into setError(...)
  } else {
    toast.error(err.message || "Failed to save")
  }
}
```

The BE wraps errors as `{ ok: false, error: { code, message, details? } }` (see `backend/src/middleware/errorMiddleware.js`). The axios interceptor in `frontend/src/lib/api.js` unwraps response.data and rethrows a normalized error.

---

## Modal pattern

```jsx
function ConfirmDelete({ open, onClose, onConfirm, leadName }) {
  if (!open) return null
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Delete lead?</h3>
          <button className="btn-icon btn-ghost" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <p>This will permanently delete <strong>{leadName}</strong> and all related activity. This cannot be undone.</p>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  )
}
```

For larger modals (Add Note, Reassign with form), use `.modal.lg` (720px) or `.modal.xl` (920px).

---

## Drag-drop library

Two options for Sprint 3 Kanban (if Kanban survives the scope decision):

### Option A — `@dnd-kit/core` (recommended)

- Actively maintained (last release Q1 2026).
- Modular: `@dnd-kit/core` + `@dnd-kit/sortable` for column reorder if needed.
- TypeScript-first, but plays fine with JSX.
- Bundle: ~12 KB gzipped for `core` alone.
- Accessibility: built-in keyboard/screen-reader support.

### Option B — `react-beautiful-dnd`

- **Unmaintained.** Atlassian archived the repo in 2023.
- Larger bundle (~32 KB gzipped).
- Better-known API but no future security updates.

### Pick — `@dnd-kit/core`

Install when starting S3-FE-B-02:

```bash
cd frontend
npm install @dnd-kit/core @dnd-kit/sortable
```

If Kanban is dropped from MVP, do nothing — no install needed.

---

## State stores

Current zustand stores in `frontend/src/stores/`:

| Store | Purpose |
|---|---|
| `authStore.js` | `user`, `status`, `signIn`, `signUp`, `signOut`, `fetchSession`. |

Add as Sprint 2/3 work lands:

| Store (proposed) | Purpose |
|---|---|
| `leadsStore.js` | Cached lead list, filters, selection. Optional — current `useLeads(params)` hook on top of axios is acceptable. |
| `kanbanStore.js` | Columns + optimistic move. Required for Kanban if kept. |
| `notificationsStore.js` | Unread count, list. |

Keep stores thin — no business logic. API calls live in `frontend/src/lib/api.js` or per-page hooks.

---

## Lead schema gaps

Fields the UI references but the Lead model doesn't have yet (flagged in Sprint 2 audit):

| Field | UI usage | Sprint to add |
|---|---|---|
| `priority` (HOT/WARM/COLD) | AddLead, LeadEdit, LeadDetail badge, Assign filter, Leads list filter | S2-BE-B-01 |
| `nextFollowUpAt` (DateTime?) | FollowUps page (bucket key), LeadDetail side panel | S2-BE-B-01 |
| `possessionTimeline` (String?) | AddLead, LeadDetail | S2-BE-B-01 |

Until these land, ported pages already render the inputs with `// TODO: requires Lead.<field>` comments. BE will silently drop them on PATCH/POST.

---

## What this doc is NOT

- **Not** wireframes — the leadpro source itself is the wireframe. Run `cd leadpro-realty && npm install && npm run dev` to view.
- **Not** an inventory of every leadpro page — see `docs/tasks/README.md` for the full page → task mapping.
- **Not** a styling guide — that's `frontend/src/styles/leadpro.css`. Read the class list there before introducing new classes.

---

## Open decisions blocking Sprint 2/3

Pulled from the 2026-05-12 task-doc audit. The TL needs to call these before BE work starts:

1. **Kanban**: keep as extension or drop from MVP? (leadpro has none)
2. **Tasks vs Follow-Ups**: back FollowUps with `lead.nextFollowUpAt` (no Task table) or with a new `Task.dueAt` (Sprint 3 BE-B-04)?
3. **Pipeline stages**: reseed 9 → 7 to match leadpro, or keep 9 and normalize on display?
4. **Auto-revenue on Booked**: replicate leadpro's `revenue = budget` auto-set, or skip?

Update this doc once each is decided.
