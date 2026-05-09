# S2-BE-B-03 — Lead manual assignment

**Owner:** BE-B
**Branch:** `be/lead/S2-BE-B-03-assign`
**Estimated:** 0.5 day
**Blocks:** S2-FE-B-01 (assignment UI in lead list/detail)
**Blocked by:** S2-BE-B-01, S3-BE-A-01 (activity log) — but the activity log can be stubbed first then wired in S3

## Goal

Endpoint to manually assign or reassign a lead to a different user. Logs an Activity row of type `ASSIGNMENT`.

## Files to read first

- `backend/src/modules/lead/lead.service.js`
- `backend/prisma/schema.prisma` (Activity model from S0-BE-A-04)
- `docs/design/lead-module.md`

## Steps

### 1. Endpoint — `POST /api/leads/:id/assign`

Body: `{assignedToId: string, reason?: string}`. Auth: OWNER/ADMIN/MANAGER (AGENTs cannot reassign). Validation: `assignedToId` must be a user in the same company.

### 2. Service

```js
async function assignLead(tenantPrisma, { leadId, assignedToId, reason, actorId }) {
  // Verify target user exists in tenant
  const target = await tenantPrisma.user.findUnique({ where: { id: assignedToId } });
  if (!target) throw new ApiError(404, "User not found in this company");

  const before = await tenantPrisma.lead.findUnique({ where: { id: leadId } });
  if (!before) throw new ApiError(404, "Lead not found");

  return await tenantPrisma.$transaction(async (tx) => {
    const lead = await tx.lead.update({
      where: { id: leadId },
      data: { assignedToId },
    });
    await tx.activity.create({
      data: {
        leadId,
        userId: actorId,
        type: "ASSIGNMENT",
        content: `Reassigned from ${before.assignedToId ?? "unassigned"} to ${assignedToId}${reason ? ` — ${reason}` : ""}`,
        metadata: { from: before.assignedToId, to: assignedToId, reason },
      },
    });
    return lead;
  });
}
```

Note: `tenantPrisma.$transaction` works with Prisma extensions (verify in Prisma docs); if not, use the base prisma + manually pass companyId.

### 3. Bulk assign — `POST /api/leads/bulk-assign`

Body: `{leadIds: string[], assignedToId: string, reason?: string}`. Loops through and assigns. Returns `{successCount, failures: [{leadId, error}]}`.

## Acceptance criteria

- [ ] Single-assign endpoint works and writes Activity row
- [ ] AGENT gets 403
- [ ] Cross-tenant assignedToId returns 404
- [ ] Bulk endpoint returns per-lead status
- [ ] curl examples

## AI prompt template

> I'm on task S2-BE-B-03. Read `backend/src/modules/lead/lead.service.js`, the Activity model in `schema.prisma`, and `docs/design/lead-module.md`. Implement single + bulk assign with Activity logging in a transaction. Confirm whether `tenantPrisma.$transaction` works with Prisma `$extends`; if not, propose an alternative.

## Notes for reviewer

- If the Activity model doesn't yet exist (S0-BE-A-04 hasn't merged), stub the activity write with a comment and leave a TODO; otherwise wire it now
- Verify the transaction actually rolls back on failure (drop a wrong assignedToId mid-test)
