# S2-FE-B-02 — Lead create form (with dedup warning)

**Owner:** FE-B
**Branch:** `fe/lead/S2-FE-B-02-create`
**Estimated:** 0.5 day
**Blocks:** —
**Blocked by:** S2-FE-B-01, S2-BE-B-02

## Goal

The "New Lead" button on the leads page opens this dialog. Includes a soft duplicate-check on blur of the phone/email field.

## Files to read first

- `frontend/src/pages/admin/Leads.jsx` (from S2-FE-B-01)
- Backend endpoints: `POST /api/leads`, `POST /api/leads/check-duplicates`
- `frontend/src/hooks/useDebounce.js`

## Steps

1. **Component** — `frontend/src/components/leads/LeadFormDialog.jsx`:
   - Props: `open`, `onOpenChange`, `lead?` (for edit reuse later), `onSuccess` (callback to refetch).
   - react-hook-form + zod
   - Fields: name, phone, email, source (select with common options + "Other"), city, requirementType (select), budget (input), interestedProjectId (select fetched from `/api/projects`), assignedToId (select fetched from `/api/users` — visible only to OWNER/ADMIN/MANAGER), tags (chip input), notes (textarea).

2. **Dedup check** — debounced on phone/email change:
   - Calls `POST /api/leads/check-duplicates` with current form state
   - If `hard.length > 0`: red warning banner above form with "Found existing leads — click to view" linking to first match. Submit becomes "Create Anyway" → calls `POST /api/leads?force=true`.
   - If `soft.length > 0`: yellow info banner: "Possible duplicates found — review before creating".

3. **Submit**:
   - Normal create → `POST /api/leads`
   - On 409 from server (race condition where someone else created the dup), show the same red banner and offer force=true retry.

4. Use the dialog from `Leads.jsx`'s "New Lead" button.

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

## Static UI reference (added 2026-05-10)

- **Layout reference:** `_tmp_leadpro/leadpro-realty/src/pages/LeadForm.jsx` — for field grouping and dialog structure.
- **Restyle:** shadcn `Dialog` (NOT his `Modal`), `Form`, `Input`, `Select`, `Textarea`. Follow `docs/STATIC-UI-MAP.md` (S0-FE-A-03).
- **Dedup banner:** colored alert via shadcn `Alert` (variant `destructive` for hard, default for soft) — do NOT use his banner CSS.
- **State:** `useLeadStore` + `services/leadService.js`. No `useApp()`.
