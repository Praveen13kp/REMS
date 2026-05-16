# S5-BE-A-07 — Team page user CRUD

**Owner:** BE dev
**Branch:** `be/user/S5-BE-A-07-crud`
**Estimated:** 0.5 day
**Blocks:** —
**Blocked by:** —

## Goal

`admin/Team.jsx` has 5 TODOs. Wire the underlying endpoints.

## Steps

1. `POST /api/users/invite` — body `{ email, name, role }`. Creates User + sends invite email. OWNER/MANAGER only.
2. `PATCH /api/users/:id` — edit name/role. Tenant-scoped. Role change OWNER-only.
3. `PATCH /api/users/:id/active` — deactivate/reactivate. OWNER/MANAGER.
4. `DELETE /api/users/:id` — soft-delete (`deletedAt`). OWNER only.
5. All endpoints emit Activity rows.

## Acceptance criteria

- [ ] All 4 endpoints work end-to-end from the Team page UI
- [ ] Tenant scope: Company A admin cannot edit a Company B user (404)
- [ ] OWNER cannot demote themselves to last-OWNER (block — 422)
- [ ] Soft-deleted user cannot log in
