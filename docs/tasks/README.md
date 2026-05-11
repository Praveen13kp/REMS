# RELMS Intern Task Board

This is the master index of all tasks for the RELMS MVP build. Read [`../CONTRIBUTING.md`](../CONTRIBUTING.md) first — it explains the workflow, file ownership, and conventions.

> **Scope:** MVP slice covering SOW Phases 1–3 (Auth, Onboarding, Lead Management, Pipeline, Tasks, Dashboards). Mobile, AI scoring, portal integrations, payments, WhatsApp/SMS, billing, RLS, and custom domains are **out of scope** for this batch and will be planned later.

> **Static UI reference (2026-05-10):** Manager delivered a full-SOW static reference build (`leadpro-realty.zip`, unzip to `_tmp_leadpro/` — gitignored). FE page tasks treat his JSX as **layout/intent reference only**: restyle to shadcn primitives via `docs/STATIC-UI-MAP.md` (produced by S0-FE-A-03), replace his `useApp()` / `localStorage` state with our zustand stores + services, use recharts (not chart.js), sonner (not his `Toaster`), and shadcn `Dialog` (not his `Modal`). **Do not** implement his marketing site (`Landing/Pricing/Features/Contact/PublicLayout`) or his extra Phase-4 pages (`SuperAdmin/Orgs/Files/Notifications/Reports/Settings/Profile`) — those are deferred post-MVP.

## Team

| Code | Owns |
|---|---|
| **BE-A** | DB schema, auth, company/user modules, platform infra (env, logger, tenant Prisma, error envelope) |
| **BE-B** | Lead, project, pipeline, activity, task, note modules |
| **FE-A** | App shell, auth flow, onboarding wizard, dashboards, sidebar/routing/API client |
| **FE-B** | Lead/project/team pages, lead detail, Kanban, forms, CSV import UI |

## Sprints at a glance

| Sprint | Focus | # tasks | Duration |
|---|---|---|---|
| [0 — Foundation](./sprint-0-foundation/) | Folder restructure, better-auth, tenant Prisma, env/logger, FE API client + shell, static-UI map, prep docs | 8 | 3 days |
| [1 — Onboarding](./sprint-1-onboarding/) | Company self-registration, user invite, RBAC, project CRUD, signup + onboarding wizard | 6 | 1 week |
| [2 — Leads core](./sprint-2-leads/) | Lead CRUD, dedup, assignment, list page + create form, team page, onboarding finish | 8 | 1 week |
| [3 — Pipeline & activity](./sprint-3-pipeline/) | Pipeline stages API, status transitions, activity log, tasks, lead detail, Kanban | 8 | 1 week |
| [4 — Dashboards & polish](./sprint-4-dashboards/) | Role-based dashboards, CSV import, notes, bug bash | 8 | 1 week |

**Total:** ~38 tasks. Estimated MVP completion: ~5 weeks of focused intern work, assuming PRs land on time.

## Sprint 0 — Foundation (everyone, blocking)

| ID | Owner | Title | Blocks |
|---|---|---|---|
| [S0-BE-A-01](./sprint-0-foundation/S0-BE-A-01-restructure-backend.md) | BE-A | Backend folder restructure | Every BE task |
| [S0-BE-A-02](./sprint-0-foundation/S0-BE-A-02-better-auth.md) | BE-A | Switch auth to better-auth | All auth-dependent work |
| [S0-BE-A-03](./sprint-0-foundation/S0-BE-A-03-tenant-prisma-env-logger.md) | BE-A | Tenant Prisma helper, env, logger, error envelope | Every feature module |
| [S0-BE-A-04](./sprint-0-foundation/S0-BE-A-04-schema-cleanup-seed.md) | BE-A | Schema cleanup pass + seed script | Most feature work |
| [S0-FE-A-01](./sprint-0-foundation/S0-FE-A-01-api-client-auth-store.md) | FE-A | API client, auth store, route guards | Every authed FE page |
| [S0-FE-A-02](./sprint-0-foundation/S0-FE-A-02-dashboard-shell.md) | FE-A | Dashboard shell + sidebar + theme | Every dashboard page |
| [S0-FE-A-03](./sprint-0-foundation/S0-FE-A-03-static-ui-intake.md) | FE-A | Static-UI intake & shadcn token map | Every FE page task |
| [S0-BE-B-01](./sprint-0-foundation/S0-BE-B-01-prep-design-doc.md) | BE-B | Prep: Lead/Pipeline design doc | S2/S3 BE tasks |
| [S0-FE-B-01](./sprint-0-foundation/S0-FE-B-01-prep-component-plan.md) | FE-B | Prep: FE component plan + drag-drop pick | S2/S3 FE tasks |

## Sprint 1 — Onboarding

| ID | Owner | Title |
|---|---|---|
| [S1-BE-A-01](./sprint-1-onboarding/S1-BE-A-01-company-registration.md) | BE-A | Company self-registration |
| [S1-BE-A-02](./sprint-1-onboarding/S1-BE-A-02-user-invite.md) | BE-A | User invite & team management |
| [S1-BE-B-01](./sprint-1-onboarding/S1-BE-B-01-project-crud.md) | BE-B | Project CRUD |
| [S1-FE-A-01](./sprint-1-onboarding/S1-FE-A-01-signup-flow.md) | FE-A | Company signup page |
| [S1-FE-A-02](./sprint-1-onboarding/S1-FE-A-02-onboarding-wizard.md) | FE-A | Onboarding wizard steps 1–2 |
| [S1-FE-B-01](./sprint-1-onboarding/S1-FE-B-01-projects-page.md) | FE-B | Projects page (list + form dialog) |

## Sprint 2 — Leads core

| ID | Owner | Title |
|---|---|---|
| [S2-BE-A-01](./sprint-2-leads/S2-BE-A-01-user-profile.md) | BE-A | User profile + onboarding completion |
| [S2-BE-B-01](./sprint-2-leads/S2-BE-B-01-lead-crud.md) | BE-B | Lead CRUD |
| [S2-BE-B-02](./sprint-2-leads/S2-BE-B-02-lead-dedup.md) | BE-B | Lead deduplication |
| [S2-BE-B-03](./sprint-2-leads/S2-BE-B-03-lead-assignment.md) | BE-B | Lead manual assignment |
| [S2-FE-A-01](./sprint-2-leads/S2-FE-A-01-onboarding-finish.md) | FE-A | Onboarding wizard steps 3–4 |
| [S2-FE-B-01](./sprint-2-leads/S2-FE-B-01-leads-list.md) | FE-B | Leads list page |
| [S2-FE-B-02](./sprint-2-leads/S2-FE-B-02-lead-create-form.md) | FE-B | Lead create form (dedup warning) |
| [S2-FE-B-03](./sprint-2-leads/S2-FE-B-03-team-page.md) | FE-B | Team page |

## Sprint 3 — Pipeline & activity

| ID | Owner | Title |
|---|---|---|
| [S3-BE-A-01](./sprint-3-pipeline/S3-BE-A-01-activity-log-helper.md) | BE-A | Activity log helper + audit trail |
| [S3-BE-B-01](./sprint-3-pipeline/S3-BE-B-01-pipeline-stages-api.md) | BE-B | Pipeline stages API |
| [S3-BE-B-02](./sprint-3-pipeline/S3-BE-B-02-lead-status-transition.md) | BE-B | Lead status transition endpoint |
| [S3-BE-B-03](./sprint-3-pipeline/S3-BE-B-03-kanban-board-endpoint.md) | BE-B | Kanban board fetch endpoint |
| [S3-BE-B-04](./sprint-3-pipeline/S3-BE-B-04-tasks-module.md) | BE-B | Tasks module |
| [S3-FE-A-01](./sprint-3-pipeline/S3-FE-A-01-my-tasks-page.md) | FE-A | My Tasks page + TaskDialog |
| [S3-FE-B-01](./sprint-3-pipeline/S3-FE-B-01-lead-detail-page.md) | FE-B | Lead detail page |
| [S3-FE-B-02](./sprint-3-pipeline/S3-FE-B-02-kanban-board.md) | FE-B | Kanban board with drag-drop |

## Sprint 4 — Dashboards & polish

| ID | Owner | Title |
|---|---|---|
| [S4-BE-A-01](./sprint-4-dashboards/S4-BE-A-01-dashboard-aggregates.md) | BE-A | Dashboard aggregate endpoints |
| [S4-BE-B-01](./sprint-4-dashboards/S4-BE-B-01-csv-import.md) | BE-B | Lead CSV import |
| [S4-BE-B-02](./sprint-4-dashboards/S4-BE-B-02-notes-module.md) | BE-B | Notes module |
| [S4-FE-A-01](./sprint-4-dashboards/S4-FE-A-01-owner-dashboard.md) | FE-A | Owner dashboard |
| [S4-FE-A-02](./sprint-4-dashboards/S4-FE-A-02-manager-dashboard.md) | FE-A | Manager dashboard |
| [S4-FE-A-03](./sprint-4-dashboards/S4-FE-A-03-agent-dashboard.md) | FE-A | Agent dashboard |
| [S4-FE-B-01](./sprint-4-dashboards/S4-FE-B-01-notes-ui.md) | FE-B | Notes UI on lead detail |
| [S4-FE-B-02](./sprint-4-dashboards/S4-FE-B-02-csv-import-ui.md) | FE-B | CSV import UI |
| [S4-shared-01](./sprint-4-dashboards/S4-shared-01-bug-bash.md) | All | Bug bash + walkthrough |

## How to use this board (intern checklist)

1. Open the sprint folder for the current sprint.
2. Find the lowest task ID in your column (BE-A / BE-B / FE-A / FE-B) that isn't done yet.
3. Read [`../CONTRIBUTING.md`](../CONTRIBUTING.md) once if you haven't today.
4. Read your task file end-to-end before touching code.
5. Follow the workflow (sync main → AI prompt → branch → implement → PR).
6. When merged, return here and pick the next ID.

## How the manager uses this board

- Track which tasks are in-flight via PR status (one PR per task)
- Move blockers forward by reordering or splitting tasks
- After each sprint, run a 30-min retro and update the next sprint's tasks if scope shifted
- After MVP (S4-shared-01 passes), draft Sprint 5+ tasks for the next chunk of SOW (e.g., communication module, advanced reports, RLS hardening)

## Out-of-scope reminders (do NOT add to MVP unless asked)

Mobile apps · AI lead scoring · 99acres/MagicBricks/Housing.com integrations · Meta/Google Ads · WhatsApp/SMS/calls · Payment gateways · Booking forms with KYC · Channel partner portal · Custom domains · Subscription billing · SSO/SAML · Row-level security · Custom report builder · Multi-language UI · IVR/telephony.

Each of the above is its own multi-week project and lives in a future SOW phase.
