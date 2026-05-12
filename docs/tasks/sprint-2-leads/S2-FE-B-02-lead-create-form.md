> **Updated 2026-05-12:** Re-scoped from a modal dialog to a **full page** (`/leads/new`), matching the leadpro source page `leadpro-realty/src/pages/AddLead.jsx`. Shadcn primitives are NOT used.

# S2-FE-B-02 — Lead create form (with dedup warning)

**Owner:** FE-B
**Branch:** `fe/lead/S2-FE-B-02-create`
**Estimated:** 0.5 day
**Blocks:** —
**Blocked by:** S2-FE-B-01, S2-BE-B-02

## Goal

The "New Lead" button on the leads page navigates to a dedicated `/leads/new` route that renders the full AddLead page (ported from `leadpro-realty/src/pages/AddLead.jsx`). Includes a soft duplicate-check on blur of the phone/email field, rendered inline above the form.

## Files to read first

- `frontend/src/pages/admin/Leads.jsx` (from S2-FE-B-01)
- Backend endpoints: `POST /api/leads`, `POST /api/leads/check-duplicates`
- `frontend/src/hooks/useDebounce.js`

## Steps

1. **Page** — `frontend/src/pages/leads/AddLead.jsx` (route `/leads/new`; reuse same file for `/leads/:id/edit` with `lead` from loader):
   - react-hook-form + zod
   - Layout: three sections inside a single `.card`, separated by `border-t`:
     1. **Customer Information** (grid sm:grid-cols-2): Customer Name *, Phone Number *, Email, City
     2. **Property & Budget**: Budget Range * (select with leadpro presets — see `AddLead.jsx`), Interested Project * (select from `/api/projects`), Property Type / `requirementType` (select), Possession Timeline (select)
     3. **Source & Notes**: Lead Source *, Initial Status (select), Notes (textarea, col-span-2)
   - Inputs use leadpro classes: `<input className="input-field" />`, `<select className="input-field">`, `<textarea className="input-field resize-none">`, labels `.label`.
   - Buttons: Reset (`.btn-secondary`) + Save Lead (`.btn-gradient` or `.btn .btn-primary`).
   - assignedToId picker visible only to OWNER/ADMIN/MANAGER.
   - tags: chip input below Notes (extension over leadpro, keep optional).

2. **Dedup check** — debounced on phone/email change:
   - Calls `POST /api/leads/check-duplicates` with current form state
   - If `hard.length > 0`: render a red inline banner ABOVE the form using leadpro classes (e.g. a `.card` with `border-error` / `bg-danger-soft`, or a small custom `.alert.alert-error` div). Text: "Found existing leads — click to view" linking to first match. Submit becomes "Create Anyway" → calls `POST /api/leads?force=true`.
   - If `soft.length > 0`: yellow inline info banner: "Possible duplicates found — review before creating".

3. **Submit**:
   - Normal create → `POST /api/leads` → navigate back to `/leads`.
   - On 409 from server (race condition where someone else created the dup), show the same red banner and offer force=true retry.

4. The Leads list "Add Lead" button navigates to `/leads/new` (no dialog).

## Acceptance criteria

- [ ] Dialog opens, validates, submits, refetches list, closes
- [ ] Dedup banner appears for hard matches with "Create Anyway" affordance
- [ ] Soft-match banner is informational only
- [ ] Server-side 409 handled gracefully
- [ ] Dialog resets when reopened

## AI prompt template

> I'm on task S2-FE-B-02. Read `docs/tasks/sprint-2-leads/S2-FE-B-01-leads-list.md`, the LeadFormDialog plan in `docs/design/frontend-components.md`, and the backend endpoints from `S2-BE-B-01-lead-crud.md` and `S2-BE-B-02-lead-dedup.md`. Build the dialog with the dedup-on-blur behavior. Show me the form schema and the dedup-check effect first.

## Notes for reviewer

- Debounce dedup-check at 400–600ms to avoid spamming
- "Create Anyway" should not be the default action — make user click it deliberately

## Static UI reference (updated 2026-05-12 — supersedes 2026-05-10)

- **Source page:** `leadpro-realty/src/pages/AddLead.jsx` — full page, not a dialog. Port 1:1.
- **Markup/classes (leadpro, in `frontend/src/styles/leadpro.css`):** `.card`, `.label`, `.input-field`, `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-gradient`. Raw `<form>`, `<input>`, `<select>`, `<textarea>` — no shadcn `Form` / `Dialog` / `Alert`.
- **Dedup banner:** plain inline div styled with leadpro tokens (`.card` + utility colors) — not shadcn `Alert`.
- **Forms:** react-hook-form + zod; bind `register('field')` directly onto the leadpro-classed inputs.
- **Icons:** lucide-react.
- **State:** `useLeadStore` + `services/leadService.js`. No `useApp()`.
- **Theme:** light default; dark via `.dark` class.
