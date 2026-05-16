# S5-BE-A-12 — Public contact form endpoint

**Owner:** BE dev
**Branch:** `be/public/S5-BE-A-12-contact`
**Estimated:** 0.25 day
**Blocks:** —
**Blocked by:** —

## Goal

`pages/public/Contact.jsx` is wired to a TODO. Originally S1-BE-A-03; never landed. Build it.

## Steps

1. New model `ContactSubmission { id, name, email, phone, subject, body, ip, ua, createdAt }`.
2. `POST /api/public/contact` — no auth, rate-limited (e.g. 3/min/IP, 30/day/IP), validates with zod, persists.
3. Notify a hardcoded SUPER_ADMIN inbox (env var) — best-effort, swallow errors.
4. Admin-side: `GET /api/admin/contact-submissions` for SUPER_ADMIN to read them.

## Acceptance criteria

- [ ] Submission writes a row
- [ ] Rate limit returns 429
- [ ] Bad data returns 400 with field-level errors
- [ ] SUPER_ADMIN can list submissions
