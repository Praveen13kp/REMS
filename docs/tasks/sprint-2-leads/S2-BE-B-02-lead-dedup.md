# S2-BE-B-02 — Lead deduplication on create

**Owner:** BE-B
**Branch:** `be/lead/S2-BE-B-02-dedup`
**Estimated:** 0.5 day
**Blocks:** S4-BE-B-01 (CSV import builds on this)
**Blocked by:** S2-BE-B-01

## Goal

When creating a lead, detect duplicates by phone (exact) or email (exact, case-insensitive). Per the design doc, also surface a soft warning for fuzzy matches on `name + city`.

## Files to read first

- `backend/src/modules/lead/lead.service.js`
- `docs/design/lead-module.md`

## Steps

### 1. Pre-create check service — `findDuplicates`

```js
async function findDuplicates(tenantPrisma, { phone, email, name, city }) {
  // 1. Hard match: phone OR email (if provided)
  const hard = await tenantPrisma.lead.findMany({
    where: {
      OR: [
        phone ? { phone } : undefined,
        email ? { email: { equals: email, mode: "insensitive" } } : undefined,
      ].filter(Boolean),
    },
    select: { id, name, phone, email, status, assignedTo: { select: {id, name} } },
  });
  // 2. Soft match: same name + city, excluding hard matches
  const soft = name && city ? await tenantPrisma.lead.findMany({
    where: {
      name: { contains: name, mode: "insensitive" },
      city: { equals: city, mode: "insensitive" },
      NOT: { id: { in: hard.map(h => h.id) } },
    },
    take: 5,
    select: { ... },
  }) : [];
  return { hard, soft };
}
```

### 2. New endpoint — `POST /api/leads/check-duplicates`

Body: `{phone?, email?, name?, city?}`. Returns `{hard: [...], soft: [...]}`. Used by the FE to warn before submission.

### 3. Behavior on `POST /api/leads`

- If `hard.length > 0` AND request did NOT include `?force=true` query → return 409 with `{ ok: false, error: { code: "LEAD_DUPLICATE", details: { matches: hard } } }`.
- If client explicitly passes `?force=true`, proceed with creation anyway (the FE may decide to allow this for OWNER/ADMIN).
- Soft matches never block creation; they're only returned by `/check-duplicates`.

### 4. Update validation

In `lead.validation.js`, the create schema is unchanged; the dedup check runs in the service before `prisma.lead.create`.

## Acceptance criteria

- [ ] `POST /api/leads/check-duplicates` returns hard + soft matches
- [ ] `POST /api/leads` rejects exact duplicates with 409
- [ ] `POST /api/leads?force=true` overrides
- [ ] curl examples added

## AI prompt template

> I'm on task S2-BE-B-02. Read `backend/src/modules/lead/lead.service.js` (from S2-BE-B-01) and `docs/design/lead-module.md`. Add the dedup check service, the `/check-duplicates` endpoint, and update the create flow to return 409 on hard matches unless `?force=true`. Walk me through the where-clause logic before writing.

## Notes for reviewer

- `mode: "insensitive"` only works on Postgres — confirmed our DB
- Phone normalization: assume the lead.validation.js phone normalizer is consistent so we don't get false negatives
