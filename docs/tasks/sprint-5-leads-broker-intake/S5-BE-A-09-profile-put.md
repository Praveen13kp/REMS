# S5-BE-A-09 — Profile PUT /users/me

**Owner:** BE dev
**Branch:** `be/user/S5-BE-A-09-profile`
**Estimated:** 0.25 day
**Blocks:** —
**Blocked by:** —

## Goal

`admin/Profile.jsx` updates the local auth store only. Persist changes.

## Steps

1. `PUT /api/users/me` — body `{ name?, phone?, avatarUrl?, locale? }`. Email change is **not** allowed here (separate flow + verification).
2. `POST /api/users/me/password` — body `{ currentPassword, newPassword }`. Verify current, hash new, invalidate sessions if policy says so.
3. Avatar upload uses existing file module (or signed URL).

## Acceptance criteria

- [ ] PUT works, Profile page reflects changes on reload
- [ ] Wrong current password → 401
- [ ] No way to escalate role through this endpoint
