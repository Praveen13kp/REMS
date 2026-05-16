# S5-FE-A-02 — Broker dashboard + company switcher

**Owner:** TL-FE
**Branch:** `fe/broker/S5-FE-A-02-dashboard`
**Estimated:** 1.5 days
**Blocks:** —
**Blocked by:** S5-BE-A-05

## Goal

A broker logs in and sees a dashboard scoped to all the brokerages they work with, switchable.

## Steps

1. New page `pages/broker/Dashboard.jsx`.
2. Top bar: company switcher (multi-select dropdown — "All companies" or pick one).
3. KPI tiles scoped to current selection: total assigned leads, hot leads, tasks due today, recent activity.
4. Tabs:
   - "Assigned to me" — leads where `assignedToId = me` for the selected company/companies
   - "My own leads" — leads where `createdBy = me`
5. Each lead row routes to the existing `LeadDetail` page; visibility is enforced server-side by S5-BE-A-05.
6. Add `BROKER` to `RoleRoute` allowlist.
7. In `admin/Team.jsx` add an "Invite broker" action (separate button from "Invite user") — calls `POST /api/users/invite-broker`.

## Acceptance criteria

- [ ] Broker user lands on `/broker` after login
- [ ] Switching companies refilters KPIs + lead lists
- [ ] Broker can open a lead and use quick actions if assigned
- [ ] OWNER sees the broker in Team page with the BROKER badge
