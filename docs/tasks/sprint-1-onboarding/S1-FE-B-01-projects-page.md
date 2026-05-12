# S1-FE-B-01 — Projects page (list + create/edit)

> **Updated 2026-05-12:** Direction changed. `leadpro-realty/` does NOT ship a standalone Projects page — the closest references are the Onboarding/Projects step and `AddLead.jsx`'s project selector. This Projects page is an **admin extension** beyond leadpro's screenshot scope: OWNER/ADMIN/MANAGER manage company-wide projects; AGENT read-only. Style with leadpro CSS classes (`.card`, `.table-wrap`, `.table`, `.btn`, `.btn-primary`, `.input`, `.select`, `.modal-backdrop`, `.modal`) — NO shadcn `Card`/`Table`/`Dialog`/`AlertDialog`/`Form`/`Input`/`Select`/`Textarea`/`Button`/`Badge`. Use the visual rhythm of `leadpro-realty/src/pages/Leads.jsx` (header → filter bar → table → pagination) for consistency. Mention the divergence in the PR description.

**Owner:** FE-B
**Branch:** `fe/project/S1-FE-B-01-projects-page`
**Estimated:** 1 day
**Blocks:** S2-FE-B-01 (lead form references projects)
**Blocked by:** S0-FE-A-02, S1-BE-B-01

## Goal

Build the Projects page so OWNER/ADMIN/MANAGER can manage projects. AGENTs see read-only.

## Files to read first

- `frontend/src/pages/admin/Projects.jsx` (current placeholder)
- `frontend/src/lib/api.js`
- Backend endpoints from `docs/tasks/sprint-1-onboarding/S1-BE-B-01-project-crud.md`
- `frontend/src/styles/leadpro.css` (leadpro classes — source of truth)
- `leadpro-realty/src/pages/Leads.jsx` (visual template for header/filter/table layout)
- `leadpro-realty/src/pages/AddLead.jsx` (project selector reference)

## Steps

1. **`useProjects` hook** — `frontend/src/hooks/useProjects.js` — wraps fetch + create + update + delete. Use plain `useState` + `useEffect` (no react-query for MVP unless you've already used it elsewhere).

2. **Projects page** (leadpro classes):
   - Header: title "Projects", subtitle, `<button className="btn btn-primary">New Project</button>` (opens modal) — disabled for AGENT
   - Filter bar: `<input className="input" />` search + `<select className="select" />` type filter
   - Table inside `<div className="table-wrap"><table className="table">…</table></div>`. Columns: Name, Location, Type, Price Range, Possession, Actions.
   - Empty state: `<div className="card">` with "No projects yet" + create button
   - Pagination buttons styled with `.btn`

3. **Project form modal** (`components/projects/ProjectFormModal.jsx`):
   - Used for both create and edit (pass `project?` prop)
   - react-hook-form + zod for validation
   - Render as `<div className="modal-backdrop"><div className="modal">…</div></div>` (NOT shadcn `Dialog`)
   - Fields with `.field` + `.input` / `.select` / `.textarea` classes: name, type, location, priceRange, description, reraNumber, possessionDate (date input), coverImageUrl
   - Submit → POST or PATCH → close modal → refetch list → `sonner` toast

4. **Delete confirmation** — a small `.modal` with the project name. On 409 (leads reference it), show the count from the error and explain. NO shadcn `AlertDialog`.

5. **Role gating** — read role from `useAuthStore`. AGENT sees only the table, no Add/Edit/Delete buttons.

## Acceptance criteria

- [ ] Page lists projects with search + filter + pagination
- [ ] Create/Edit/Delete work end-to-end
- [ ] Role gating works (test by switching user role in DB)
- [ ] Empty state shown when no projects
- [ ] Failed delete (409) shows the lead count

## AI prompt template

> I'm on task S1-FE-B-01. Read `frontend/src/pages/admin/Projects.jsx`, `frontend/src/lib/api.js`, `docs/tasks/sprint-1-onboarding/S1-BE-B-01-project-crud.md` (for endpoint contracts), and `docs/design/frontend-components.md`. Build the projects page and dialog. Use shadcn Table, Dialog, Form, AlertDialog. Walk me through the data fetching pattern (no react-query) and the file layout before writing.

## Notes for reviewer

- Don't over-engineer pagination — server returns `{items,total,page,pageSize}`, just hook up Prev/Next
- The form dialog must reset when reopened for create vs edit

## Static UI reference (updated 2026-05-12)

- **Layout reference:** `leadpro-realty/` does NOT ship a Projects page — use `leadpro-realty/src/pages/Leads.jsx` table + filter bar as the visual template. This page is an admin extension beyond the static-UI scope; flag in PR.
- **Restyle:** leadpro classes from `frontend/src/styles/leadpro.css` — `.card`, `.table-wrap`, `.table`, `.field`, `.input`, `.select`, `.textarea`, `.btn`, `.btn-primary`, `.modal-backdrop`, `.modal`, `.badge`. NO shadcn primitives.
- **State:** zustand `useProjectStore` + `services/projectService.js`. Do NOT use his `useApp()` / `data` global.
- **Helpers:** date/price formatting via `lib/format.js`. Toasts via `sonner`. Icons via `lucide-react`.
