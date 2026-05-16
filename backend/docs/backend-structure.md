# Backend Structure — RELMS

## Directory Tree

```
backend/
├── .env                          # Environment variables (local, gitignored)
├── .env.example                  # Template for required env vars
├── .gitignore                    # Git ignore rules
├── AUTH.md                       # Authentication documentation
├── README.md                     # Project overview & setup guide
├── package.json                  # Node.js dependencies & scripts
├── package-lock.json             # Locked dependency versions
├── prisma.config.ts              # Prisma config file
├── server.js                     # Entry point — starts Express + mounts better-auth
├── server.log                    # Server stdout log
├── server-err.log                # Server stderr log
│
├── docs/
│   └── sample-leads.csv          # Sample CSV for lead import testing
│
├── prisma/
│   ├── schema.prisma             # Database schema (models: User, Lead, Project, Task, etc.)
│   ├── seed.js                   # Database seed script
│   └── migrations/               # Prisma migration files (10 migrations)
│
├── scripts/
│   ├── seed-test-leads.js        # Script to seed test leads
│   ├── seed-test-users.js        # Script to seed test users
│   └── test-smtp.js              # Script to test SMTP email config
│
└── src/
    ├── app.js                    # Express app setup (CORS, helmet, routes, error handler)
    │
    ├── config/
    │   └── prisma.js             # Prisma client singleton instance
    │
    ├── lib/
    │   ├── ApiError.js           # Custom API error class with status codes
    │   ├── auth.js               # better-auth initialization (handles login/register/session)
    │   ├── env.js                # Zod-validated environment variables
    │   ├── logger.js             # Pino logger setup
    │   ├── mail.js               # Email sending (SMTP with console fallback)
    │   ├── tenantPrisma.js       # Multi-tenant Prisma client (scopes queries to tenant)
    │   └── emails/
    │       └── inviteEmail.js    # HTML template for user invitation email
    │
    ├── middleware/
    │   ├── authMiddleware.js     # JWT/session authentication check
    │   ├── tenantMiddleware.js   # Extracts tenant (company) from current user
    │   ├── rbacMiddleware.js     # Role-based access control (Owner, Admin, Manager, Agent)
    │   ├── requirePlatformAdmin.js # Restricts to PLATFORM_ADMIN role
    │   └── errorMiddleware.js    # Global error handler
    │
    ├── routes/
    │   └── index.js              # Central router — mounts all module routes
    │
    ├── utils/
    │   └── .gitkeep              # Placeholder for future utilities
    │
    └── modules/
        ├── auth/
        │   ├── auth.controller.js    # Auth flow handlers (placeholder for company registration)
        │   ├── auth.service.js       # Auth business logic
        │   ├── auth.routes.js        # Auth routes placeholder
        │   └── auth.validation.js    # Auth request validation schemas
        │
        ├── user/
        │   ├── user.controller.js    # Handlers: invite, acceptInvite, CRUD users, getMe, changePassword
        │   ├── user.service.js       # User business logic
        │   ├── user.routes.js        # User routes (/api/users/*)
        │   └── user.validation.js    # User request validation schemas
        │
        ├── lead/
        │   ├── lead.controller.js    # Handlers: CRUD leads, assign, transition, import CSV, check duplicates
        │   ├── lead.service.js       # Lead business logic
        │   ├── lead.import.service.js# CSV import parsing & bulk insert logic
        │   ├── lead.routes.js        # Lead routes (/api/leads/*)
        │   └── lead.validation.js    # Lead request validation schemas
        │
        ├── company/
        │   ├── company.controller.js # Handlers: register company, get/update profile, complete onboarding
        │   ├── company.service.js    # Company business logic
        │   ├── company.routes.js     # Company routes (/api/company/*)
        │   └── company.validation.js # Company request validation schemas
        │
        ├── project/
        │   ├── project.controller.js # Handlers: CRUD projects
        │   ├── project.service.js    # Project business logic
        │   ├── project.routes.js     # Project routes (/api/projects/*)
        │   └── project.validation.js # Project request validation schemas
        │
        ├── task/
        │   ├── task.controller.js    # Handlers: CRUD tasks, mark complete
        │   ├── task.service.js       # Task business logic
        │   ├── task.routes.js        # Task routes (/api/tasks/*)
        │   └── task.validation.js    # Task request validation schemas
        │
        ├── pipeline/
        │   ├── pipeline.controller.js# Handlers: get stages, reorder, update stage, get board
        │   ├── pipeline.service.js   # Pipeline business logic
        │   ├── pipeline.routes.js    # Pipeline routes (/api/pipeline/*)
        │   └── pipeline.constants.js # Pipeline default stage definitions
        │
        ├── contact/
        │   ├── contact.controller.js # Handler: public contact form submission
        │   ├── contact.service.js    # Contact submission business logic
        │   ├── contact.routes.js     # Public contact route (/api/public/contact)
        │   └── contact.validation.js # Contact form validation schemas
        │
        ├── activity/
        │   ├── activity.controller.js# Handler: get activity log for a lead
        │   ├── activity.service.js   # Activity business logic
        │   └── activity.routes.js    # Activity routes (nested under /leads/:leadId/activity)
        │
        ├── note/
        │   ├── note.controller.js    # Handlers: CRUD notes (on leads)
        │   ├── note.service.js       # Note business logic
        │   ├── note.routes.js        # Note routes (/api/notes/*)
        │   └── note.validation.js    # Note request validation schemas
        │
        ├── file/
        │   ├── file.controller.js    # Handlers: upload, list, download, delete files, list folders, get usage
        │   ├── file.service.js       # File business logic + AWS S3 storage
        │   ├── file.routes.js        # File routes (/api/files/*)
        │   └── (validation inlined)  # Multer middleware for file uploads
        │
        ├── notification/
        │   ├── notification.controller.js # Handlers: list, mark read, mark all read, delete, clear all, get counts
        │   ├── notification.service.js    # Notification business logic
        │   ├── notification.routes.js     # Notification routes (/api/notifications/*)
        │   └── notify.js                  # In-app notification dispatch helper
        │
        ├── dashboard/
        │   ├── dashboard.controller.js # Handlers: owner, manager, agent, reports dashboards
        │   ├── dashboard.service.js    # Dashboard aggregation queries
        │   └── dashboard.routes.js     # Dashboard routes (/api/dashboard/*)
        │
        └── admin/
            ├── admin.controller.js # Handlers: platform stats, manage companies, signups, health, activity
            ├── admin.service.js    # Admin platform business logic
            └── admin.routes.js     # Admin routes (/api/admin/*)
```

---

## CRUD & Operations by Entity 

| Entity | Create | Read | Update | Delete | Other Operations |
|--------|--------|------|--------|--------|------------------|
| **Lead** | `POST /api/leads` | `GET /api/leads`, `GET /api/leads/:id`, `GET /api/leads/unassigned` | `PATCH /api/leads/:id` | `DELETE /api/leads/:id` | `POST /assign`, `POST /bulk-assign`, `POST /auto-assign`, `POST /:id/transition`, `POST /import`, `POST /check-duplicates` |
| **User** | `POST /api/users/invite` | `GET /api/users`, `GET /api/users/:id`, `GET /api/users/me` | `PATCH /api/users/:id`, `PATCH /api/users/me` | — | `POST /invite/:token/accept`, `POST /invite/:id/resend`, `GET /invite/:token`, `POST /me/change-password`, `GET /workload` |
| **Company** | `POST /api/company/register` | `GET /api/company/me` | `PATCH /api/company/me` | — | `POST /me/complete-onboarding` |
| **Project** | `POST /api/projects` | `GET /api/projects`, `GET /api/projects/:id` | `PATCH /api/projects/:id` | `DELETE /api/projects/:id` | — |
| **Task** | `POST /api/tasks` | `GET /api/tasks`, `GET /api/tasks/:id` | `PATCH /api/tasks/:id` | `DELETE /api/tasks/:id` | `POST /:id/complete` |
| **Pipeline Stage** | — | `GET /api/pipeline/stages`, `GET /api/pipeline/board` | `PATCH /api/pipeline/stages/:id`, `PATCH /api/pipeline/stages/reorder` | — | — |
| **Note** | `POST /api/notes` | `GET /api/notes` | `PATCH /api/notes/:id` | `DELETE /api/notes/:id` | — |
| **File** | `POST /api/files` | `GET /api/files`, `GET /api/files/folders`, `GET /api/files/usage`, `GET /api/files/:id/download` | — | `DELETE /api/files/:id` | — |
| **Notification** | — | `GET /api/notifications`, `GET /api/notifications/unread-count`, `GET /api/notifications/counts` | `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all` | `DELETE /api/notifications/:id`, `DELETE /api/notifications` | — |
| **Activity** | — | `GET /api/leads/:leadId/activity` | — | — | — |
| **Dashboard** | — | `GET /api/dashboard/owner`, `GET /api/dashboard/manager`, `GET /api/dashboard/agent`, `GET /api/dashboard/reports` | — | — | — |
| **Admin (Platform)** | — | `GET /api/admin/stats`, `GET /api/admin/companies`, `GET /api/admin/companies/:id`, `GET /api/admin/signups/recent`, `GET /api/admin/signups/weekly`, `GET /api/admin/health`, `GET /api/admin/activity` | `PATCH /api/admin/companies/:id` | `DELETE /api/admin/companies/:id` | — |
| **Contact Submission** | `POST /api/public/contact` | — | — | — | — |
| **Auth** | — | — | — | — | Login, register, logout, session managed by **better-auth** at `/api/auth/*` |

---   

## File Responsibilities (Simple Words)

### Root Files
- **`.env`** — Stores secret config like database URL, SMTP credentials (not committed to git).
- **`.env.example`** — Template showing what env vars are needed; copy to `.env` and fill in.
- **`server.js`** — The starting point; boots up the Express server on a port and hooks up authentication.
- **`package.json`** — Lists all Node.js packages the project depends on and scripts to run them.
- **`prisma.config.ts`** — TypeScript config file for Prisma ORM.

### `prisma/` — Database Layer
- **`schema.prisma`** — Defines all database tables (Lead, User, Company, Project, Task, etc.) and their relationships.
- **`seed.js`** — Fills the database with sample/initial data for development.
- **`migrations/`** — Each folder records a database schema change (like adding a column or table).

### `src/config/prisma.js` — Exports a single Prisma client that the whole app uses to talk to PostgreSQL.

### `src/lib/` — Shared Utilities
- **`ApiError.js`** — A custom error class that carries an HTTP status code (e.g., 404, 403) so error middleware can respond properly.
- **`auth.js`** — Sets up the "better-auth" library (login, register, sessions, password reset).
- **`env.js`** — Reads and validates environment variables using Zod; crashes early if anything is missing.
- **`logger.js`** — Sets up Pino (a fast logger) for structured logging.
- **`mail.js`** — Sends emails via SMTP; if SMTP isn't configured, just logs to console (handy in dev).
- **`tenantPrisma.js`** — Wraps Prisma queries to automatically filter by the current company (multi-tenant support).
- **`emails/inviteEmail.js`** — HTML template for the email sent when inviting a new user.

### `src/middleware/` — Request Processing Pipeline
- **`authMiddleware.js`** — Checks if the request has a valid session/token; rejects unauthenticated requests.
- **`tenantMiddleware.js`** — Figures out which company the logged-in user belongs to and attaches it to the request.
- **`rbacMiddleware.js`** — Checks if the user's role (Owner, Admin, Manager, Agent) is allowed to access a route.
- **`requirePlatformAdmin.js`** — Only lets platform-level admins through (for the admin panel).
- **`errorMiddleware.js`** — Catches all thrown errors and sends a consistent JSON error response.

### `src/modules/` — Feature Modules (each has controller + service + routes + validation)

#### Auth — Registration & Login
- **controller** — Handles HTTP requests for auth (invite-company flow placeholder).
- **service** — Logic for user sign-up, login flows.
- **validation** — Ensures email/password etc. are valid format.

#### User — Manage Users
- **controller** — Handles invite, accept invite, list/get/update users, change password.
- **service** — Logic for creating users, generating invite tokens, assigning roles.
- **validation** — Ensures user data is valid (email format, role enum, etc.).

#### Lead — Core CRM Entity (a potential customer)
- **controller** — Handles creating, listing, viewing, editing, deleting leads; assigning to agents; moving through pipeline stages; importing from CSV; checking duplicates.
- **service** — Business rules for lead management, scoring, assignment.
- **import service** — Parses uploaded CSV files, validates rows, bulk inserts leads.

#### Company — Tenant/Organization Profile
- **controller** — Handles company registration, viewing/editing company profile, completing onboarding.
- **service** — Company creation and update logic.
- **validation** — Ensures company name, type, etc. are valid.

#### Project — Real Estate Projects
- **controller** — Full CRUD for real-estate projects (name, location, type, price range).
- **service** — Project business logic.
- **validation** — Project data validation.

#### Task — To-do Items
- **controller** — CRUD tasks + mark as complete. Tasks can be linked to leads and projects.
- **service** — Task business logic.
- **validation** — Task data validation.

#### Pipeline — Sales Pipeline (Stages like New → Contacted → Negotiation → Won/Lost)
- **controller** — Get all stages, get board view (leads grouped by stage), reorder stages, rename stage.
- **service** — Pipeline stage logic.
- **constants** — Default stage definitions.

#### Contact — Public Contact Form
- **controller** — Accepts public form submissions (name, email, message) with rate limiting.
- **service** — Saves contact submission to database.
- **validation** — Contact form field validation.

#### Activity — Activity Log
- **controller** — Returns all logged activities for a specific lead (calls, emails, status changes).
- **service** — Activity query logic.

#### Note — Notes on Leads
- **controller** — CRUD notes attached to leads.
- **service** — Note business logic.
- **validation** — Note content validation.

#### File — File Uploads/Storage
- **controller** — Upload files (to S3), list files, list folders, download, delete, get storage usage.
- **service** — S3 upload/download logic and file metadata management.

#### Notification — In-App Notifications
- **controller** — List notifications, get unread count, mark as read, delete, clear all.
- **service** — Notification query and update logic.
- **notify.js** — Helper function to create and send notifications to users.

#### Dashboard — Analytics & Reports
- **controller** — Returns aggregated data for owner, manager, agent dashboards and reports.
- **service** — Runs aggregation queries (lead counts, conversion rates, team performance).

#### Admin — Platform Administration
- **controller** — Platform-wide stats, list/manage companies, view signups, health check, activity audit log.
- **service** — Admin query logic across all companies.

### `src/routes/index.js` — Central Router
- Imports all module routes and mounts them under `/api/leads`, `/api/users`, `/api/projects`, etc.

---

*Document generated for the `backend/` folder of RELMS.*
