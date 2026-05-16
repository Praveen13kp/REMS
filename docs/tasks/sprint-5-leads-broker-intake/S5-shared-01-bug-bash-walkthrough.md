# S5-shared-01 — Bug-bash walkthrough (re-run S4-shared-01)

**Owner:** Whole team
**Branch:** N/A (issues filed individually)
**Estimated:** 1 day
**Blocks:** MVP sign-off
**Blocked by:** all Sprint-5 BE work

## Goal

Sprint-4 left `docs/tasks/sprint-4-dashboards/S4-shared-01-bug-bash.md` as a 15-step walkthrough script. It was never run end-to-end with the new Sprint-5 features. Run it now.

## Steps

1. Follow the 15-step script in `S4-shared-01-bug-bash.md` verbatim.
2. **Additionally**, exercise Sprint-5 features:
   - Multi-tenant email: register the same email in two companies, log into each
   - SuperAdmin separate login
   - Broker invite + accept, broker switches companies
   - FB intake: POST a sample payload to the webhook → lead appears in the right company
   - Pricing on landing visible; only Google social button on login
3. File issues with severity, owner. Fix Sev1s same day.

## Acceptance criteria

- [ ] All 15 original steps + 5 Sprint-5 steps pass
- [ ] Zero Sev1 issues open
- [ ] `docs/known-issues.md` updated
