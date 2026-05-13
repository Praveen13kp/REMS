# S3-BE-B-02 — Lead status transition endpoint

> **Updated 2026-05-12:** UI source of truth is `leadpro-realty/src/pages/LeadDetail.jsx`. The status change UX there is **a row of clickable badges** (one per status) inside the Status & Workflow card, not a dropdown. Clicking any badge calls `changeStatus(s)` which also auto-sets `revenue = budget` when transitioning to `Booked`.
>
> **Impact:**
> - Endpoint contract is unchanged.
> - leadpro does NOT prompt for a reason when moving to `Lost` — our backend will still require it; FE will need an inline reason input (small popover) before firing. Flag for FE-B in S3-FE-B-01.
> - leadpro's status names: `New, Contacted, Interested, Site Visit, Negotiation, Booked, Lost`. Our schema seeded 9. Normalize on compare as planned.

**Owner:** BE-B
**Branch:** `be/lead/S3-BE-B-02-transition`
**Estimated:** 0.5 day
**Blocks:** S3-FE-B-02 (Kanban drag-drop)
**Blocked by:** S2-BE-B-01, S3-BE-A-01

## Goal

Status changes have rules and side-effects, so they get their own endpoint (PATCH on lead rejects status from S2-BE-B-01).

## Steps

### 1. Endpoint — `POST /api/leads/:id/transition`

Body: `{toStatus: string, reason?: string}`. Auth: any role assigned to or above the lead.

### 2. Service logic

```js
async function transitionLead(tenantPrisma, { leadId, toStatus, reason, actor }) {
  const lead = await tenantPrisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new ApiError(404);
  if (lead.status === toStatus) return lead;

  // Validate target status exists in this company's pipeline stages
  // (For MVP, status is a string matching a PipelineStage.name — yes, this is brittle; future task: switch Lead.status to a stageId FK)
  const stages = await tenantPrisma.pipelineStage.findMany();
  const target = stages.find(s => normalize(s.name) === normalize(toStatus));
  if (!target) throw new ApiError(400, "Unknown stage");

  // Lost / Junk requires reason
  if ((target.isLost || toStatus === "CLOSED_LOST") && !reason) {
    throw new ApiError(400, "Reason required for lost/closed-lost");
  }

  return tenantPrisma.$transaction(async (tx) => {
    const updated = await tx.lead.update({
      where: { id: leadId },
      data: { status: toStatus, lastContactedAt: new Date() },
    });
    await logActivity(tx, {
      leadId,
      userId: actor.id,
      type: "STATUS_CHANGE",
      content: `${lead.status} → ${toStatus}${reason ? ` — ${reason}` : ""}`,
      metadata: { from: lead.status, to: toStatus, reason },
    });
    return updated;
  });
}
```

### 3. Allowed-transition map (optional but recommended)

For MVP, allow any → any (configurable later). But add a constant `ALLOWED_TRANSITIONS` in `pipeline.constants.js` and gate it behind a feature flag we can flip on later.

### 4. Decision — leave a comment

Add a TODO in the file noting that `Lead.status` should become a foreign key to `PipelineStage` in a future migration, so custom stage names work properly. For MVP, default-9 stages map cleanly.

### 5. Notification side-effect (added 2026-05-11)

After the transaction commits, fire-and-forget `notify()` (helper from S4-BE-A-02) to the lead's `assignedToId` (and creator if different) with type `LEAD_STATUS_CHANGED`, link `/leads/<id>`, body `"<lead.name> moved to <toStatus>"`. Wrap the call in try/catch — never let a notify failure roll back the transition. If S4-BE-A-02 hasn't landed yet, leave a `// TODO(S4-BE-A-02): notify()` comment and merge without the call.

## Acceptance criteria

- [ ] Endpoint persists status + lastContactedAt
- [ ] Activity row written
- [ ] Lost requires reason; without reason → 400
- [ ] Re-applying same status is a no-op (no extra activity row)
- [ ] Notification emitted to assignedTo on successful transition (or TODO marker if S4-BE-A-02 isn't merged yet)
- [ ] curl example

## AI prompt template

> I'm on task S3-BE-B-02. Read `docs/design/pipeline-module.md`, `backend/src/modules/lead/lead.service.js`, the activity helper from S3-BE-A-01, and the Pipeline schema. Build the transition endpoint. The Lead.status string vs PipelineStage.name mismatch is annoying — for MVP, normalize on compare. Show me the validation cascade first.

## Notes for reviewer

- The TODO about FK migration is intentional — flag for the absent BE intern to pick up
- Verify activity is inside the transaction (rollback on update fail)
