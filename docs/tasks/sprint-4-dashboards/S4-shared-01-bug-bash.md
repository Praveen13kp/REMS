# S4-shared-01 — Bug bash + end-to-end walkthrough

**Owner:** All four interns + manager
**Branch:** none (issues filed individually)
**Estimated:** 1 day (full day with whole team)
**Blocks:** MVP sign-off
**Blocked by:** every other task in S0–S4

## Goal

Spend a full day exercising the system end-to-end as a real user would. Find issues. File them. Fix the criticals before MVP cut.

## Walkthrough script (each intern runs end-to-end)

1. Visit `/signup` → register a brand-new company "Bug Bash Realty"
2. Complete the onboarding wizard (all 4 steps)
3. Invite 2 teammates with different roles → copy invite link → accept invite in incognito window
4. Create 3 projects with different types
5. Create 10 leads (mix of sources, projects, assignees)
6. Try to create a duplicate lead — verify the dedup warning
7. Open a lead, change status to each of the 9 stages, transitioning to "Closed Lost" must require a reason
8. Reassign a lead to a teammate
9. Add 3 notes to a lead, edit one, delete one
10. Create 3 tasks (one per role); complete one
11. Toggle leads view to Kanban → drag-drop a card across stages
12. Apply filters in the leads table; reset; verify URL params
13. Test CSV import with the sample file
14. As OWNER, view dashboard; as MANAGER, view dashboard; as AGENT, view dashboard
15. Try to break tenant isolation: log into Company A, copy a lead ID, log out, log into Company B, GET that lead ID → must 404

## Issue logging

Use a shared sheet (or GitHub Issues if `gh` is set up by then). Each issue:
- Title
- Steps to reproduce
- Expected vs actual
- Severity (Sev1: blocks demo / Sev2: visible bug / Sev3: polish)
- Owner

## Fix sprint (afternoon)

- Sev1s assigned and fixed same-day; PRs follow normal workflow
- Sev2s scheduled for the next sprint or post-MVP
- Sev3s logged in a `docs/known-issues.md` for transparency

## Acceptance criteria

- [ ] All 15 walkthrough steps pass for each intern (4 runs)
- [ ] Zero Sev1 issues open
- [ ] `docs/known-issues.md` exists with everything not fixed
- [ ] Demo video (manager records 5-min walkthrough) saved

## AI prompt template

> N/A — this is a manual testing task. Use AI for individual fix PRs only.
