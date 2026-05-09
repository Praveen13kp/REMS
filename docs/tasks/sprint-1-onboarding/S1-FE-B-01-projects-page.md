# S1-FE-B-01 — Projects page (list + create/edit)

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
- `frontend/src/components/ui/{table,dialog,form,input,select,button,card}.jsx`
- `docs/design/frontend-components.md` (from S0-FE-B-01)

## Steps

1. **`useProjects` hook** — `frontend/src/hooks/useProjects.js` — wraps fetch + create + update + delete. Use plain `useState` + `useEffect` (no react-query for MVP unless you've already used it elsewhere).

2. **Projects page**:
   - Header: title "Projects", subtitle, primary button "New Project" (opens dialog) — disabled for AGENT
   - Search input (filters client-side for now; server `?search=` is fine too)
   - Type filter (select)
   - Table columns: Name, Location, Type, Price Range, Possession, Actions (Edit / Delete — gated by role)
   - Empty state: friendly card with "No projects yet" + button to create
   - Pagination (use the `total/page/pageSize` from API)

3. **Project form dialog** (`components/projects/ProjectFormDialog.jsx`):
   - Used for both create and edit (pass `project?` prop)
   - react-hook-form + zod
   - Fields: name, type (select), location, priceRange, description (textarea), reraNumber, possessionDate (date input), coverImageUrl
   - Submit → POST or PATCH → close dialog → refetch list → toast

4. **Delete confirmation** — shadcn `AlertDialog` with the project name. On 409 (leads reference it), show the count from the error and explain.

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
