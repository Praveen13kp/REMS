# S1-BE-A-03 — Public contact-form endpoint

> **Updated 2026-05-12:** Payload shape mismatch flagged. The new static-UI source of truth `leadpro-realty/src/pages/Contact.jsx` collects: `firstName`, `lastName`, `email`, `company`, `teamSize` (enum: 1–10 / 11–50 / 51–200 / 200+), `message`. The current BE schema collects: `name`, `email`, `company`, `phone`, `message`, `source`. **Reconcile options** (FE adapts since BE is shipped): FE sends `name = firstName + " " + lastName`, drops `teamSize` (or stuffs it into `source` / `message`), and `phone` becomes optional/blank. If a richer contact submission is desired later, add `teamSize` to the schema as an optional string in a follow-up migration. No immediate BE change required for MVP.

**Owner:** BE-A
**Branch:** `be/public/S1-BE-A-03-contact`
**Estimated:** 0.25 day
**Blocks:** S1-FE-B-02 (marketing site contact page)
**Blocked by:** S0-BE-A-03

## Goal

Tiny public (unauthenticated) endpoint for the marketing site's contact form. Stores submissions for sales follow-up; no email fan-out in MVP.

## Schema

```prisma
model ContactSubmission {
  id        String   @id @default(cuid())
  name      String
  email     String
  company   String?
  phone     String?
  message   String
  source    String?  // utm_source or referrer
  ip        String?
  userAgent String?
  createdAt DateTime @default(now())

  @@index([createdAt])
}
```

Migration: `contact_submissions_init`.

## Endpoint

- `POST /api/public/contact` — public, **no auth**.
  - Body: `{ name, email, company?, phone?, message, source? }`.
  - Validation: zod — name 1–120, email valid, message 1–2000.
  - Rate limit: 5 req/min per IP (use `express-rate-limit` or whichever middleware is already in the project).
  - Captures IP + user-agent server-side.
  - Returns `{ ok: true }` on success.

Optionally also expose `GET /api/admin/contact-submissions` under platform-admin (S4-BE-A-03) — but only if cheap to add; otherwise punt.

## Acceptance criteria

- [ ] Migration applies
- [ ] `POST /api/public/contact` works unauthenticated
- [ ] Validation rejects bad input with the standard error envelope
- [ ] Rate limit returns 429 after 5/min per IP
- [ ] IP + user-agent stored
- [ ] curl examples in the PR

## AI prompt template

> I'm on task S1-BE-A-03. Tiny task — add the ContactSubmission model, one POST endpoint, zod validation, and a per-IP rate limit. Make sure the endpoint is mounted BEFORE any auth middleware. Show me the route placement before writing.

## Notes for reviewer

- This endpoint is publicly reachable — be paranoid about validation and rate limits.
- No email/Slack fan-out yet. Sales reads from the DB or admin UI until a future task adds notifications.
