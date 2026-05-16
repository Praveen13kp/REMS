# S5-FE-B-06 — Wire lead `priority` field

**Owner:** FE dev
**Branch:** `fe/lead/S5-FE-B-06-priority`
**Estimated:** 0.25 day
**Blocks:** —
**Blocked by:** —

## Goal

`Lead.priority` already exists in `schema.prisma` and the BE accepts it. The form just doesn't expose it.

## Steps

1. `pages/admin/LeadEdit.jsx` line ~237 — remove the TODO, add a `<Select>` with options Low / Medium / High / Urgent.
2. Same select in `pages/admin/AddLead.jsx`.
3. Render priority badge in the lead row (Leads.jsx) and lead detail header.
4. Default in form = `Medium`.

## Acceptance criteria

- [ ] Create + edit lead persists `priority`
- [ ] Badge shows on list, detail, and Kanban card
- [ ] Filter chip for priority works in the Leads table
