# RELMS Backend — Complete Team Guide

> **Target Audience:** Non-coders, junior developers, and anyone who needs to understand how the backend works.
> **Purpose:** Explain every library, every data flow, every API endpoint, and how everything connects.

---

## TABLE OF CONTENTS

1. [What is a Backend? (Conceptual)](#1-what-is-a-backend-conceptual)
2. [Tech Stack Overview](#2-tech-stack-overview)
3. [Project Structure — Folder by Folder](#3-project-structure)
4. [How a Request Flows (End-to-End)](#4-how-a-request-flows)
5. [Database Models Explained (Plain English)](#5-database-models)
6. [Authentication & Login Flow](#6-authentication)
7. [Company Registration Flow](#7-company-registration)
8. [User Invitation & Role Management](#8-user-invitation)
9. [Lead CRUD — The Core Feature](#9-lead-management)
10. [Lead Import from CSV](#10-lead-import)
11. [Pipeline Stages & Lead Transitions](#11-pipeline-stages)
12. [Lead Privacy (PII Masking)](#12-lead-privacy)
13. [Lead Duplicate Detection](#13-duplicate-detection)
14. [Lead Auto-Assignment & Bulk Assignment](#14-lead-assignment)
15. [Lead Aging System](#15-lead-aging)
16. [Click-to-Call Feature](#16-click-to-call)
17. [Tasks Management](#17-tasks)
18. [Projects Management](#18-projects)
19. [Notes & Activity Log](#19-notes-activity)
20. [Notifications System](#20-notifications)
21. [File Upload & Storage](#21-file-upload)
22. [Multi-Tenancy Architecture](#22-multi-tenancy)
23. [Role-Based Access Control (RBAC)](#23-rbac)
24. [Plan System (Free Trial → Pro → Enterprise)](#24-plan-system)
25. [Billing & Razorpay Integration](#25-billing)
26. [Platform Admin (Super Admin)](#26-platform-admin)
27. [Lead Intake Webhooks (Facebook/Instagram)](#27-lead-intake)
28. [Integrations Framework (BYO Providers)](#28-integrations)
29. [Webhooks System](#29-webhooks)
30. [Broker Role](#30-broker-role)
31. [Background Schedulers](#31-background-schedulers)
32. [Error Handling](#32-error-handling)
33. [Security Practices](#33-security)
34. [Glossary](#34-glossary)

---

## 1. What is a Backend? (Conceptual)

### Simple Analogy

Think of a **restaurant**:

| Restaurant | Backend (our code) |
|------------|-------------------|
| **Kitchen** | Server (`server.js`) — where all the work happens |
| **Waiter** | API Routes — takes orders from customers (frontend) to the kitchen |
| **Cook** | Controller & Service — prepares the food (processes data) |
| **Recipe Book** | Validation (Zod) — ensures the right ingredients are used |
| **Pantry/Storage** | Database (PostgreSQL) — stores all ingredients and prepared dishes |
| **Chef's Log** | Logger (Pino) — records what happened during cooking |
| **Menu Card** | Plan Limits — what each customer is allowed to order |
| **Security Guard** | Auth Middleware — checks if the customer is allowed to enter |

### How the Internet Works (Simplified)

1. **Frontend** (React app in browser) → makes an **HTTP request** (like a phone call)
2. **Backend** (our Node.js server) → receives the call, processes it
3. **Database** (PostgreSQL) → stores/retrieves data
4. **Response** → backend sends data back to frontend

### HTTP Methods (Verbs)

| Method | What it means | Example |
|--------|--------------|---------|
| `GET` | Read/Retrieve data | "Show me all leads" |
| `POST` | Create new data | "Add a new lead" |
| `PATCH` | Update existing data | "Edit this lead's name" |
| `DELETE` | Remove data | "Delete a lead" |

---

## 2. Tech Stack Overview

### Runtime & Framework

| Technology | Version | What it does |
|-----------|---------|-------------|
| **Node.js** | 18+ | JavaScript runtime — runs our code outside the browser |
| **Express** | 5.2.1 | Web framework — handles HTTP requests/routes, like a traffic controller |
| **CommonJS** | — | Module system (`require()` / `module.exports`) |

### Database

| Technology | Version | What it does |
|-----------|---------|-------------|
| **PostgreSQL** | 15+ | Relational database — stores all data in tables like Excel sheets |
| **Prisma** | 6.19.3 | ORM (Object-Relational Mapping) — lets us write database queries in JavaScript instead of SQL. Acts as a translator between our code and PostgreSQL |
| **Prisma Client** | 6.19.3 | Auto-generated query builder — we call `prisma.lead.findMany()` and it generates `SELECT * FROM leads` behind the scenes |

### Authentication

| Technology | Version | What it does |
|-----------|---------|-------------|
| **better-auth** | 1.6.9 | Authentication library — handles signup, login, sessions, password reset, Google OAuth. Like having a security guard service |
| **Zod** | 4.4.3 | Validation library — checks that incoming data has the right shape before we use it |

### Utilities

| Technology | Version | What it does |
|-----------|---------|-------------|
| **Pino** | 10.3.1 | Logger — records everything the server does (like a black box in a plane) |
| **Nodemailer** | 8.0.7 | Email sender — sends invite emails, password reset links, etc. |
| **Multer** | 2.1.1 | File upload handler — processes files sent by users |
| **csv-parse** | 6.2.1 | CSV parser — reads Excel/CSV files for lead import |
| **Razorpay** | 2.9.6 | Payment gateway — handles subscriptions and payments |
| **Helmet** | 8.1.0 | Security middleware — protects against common web attacks |
| **CORS** | 2.8.6 | Cross-Origin Resource Sharing — controls which websites can talk to our API |
| **cookie-parser** | 1.4.7 | Cookie reader — reads session cookies from browser requests |
| **express-rate-limit** | 7.1.5 | Rate limiter — prevents too many requests from the same IP |

### Development Tools

| Technology | Version | What it does |
|-----------|---------|-------------|
| **Jest** | 30.4.2 | Testing framework — runs automated tests |
| **Supertest** | 7.2.2 | HTTP testing — simulates API calls in tests |
| **Nodemon** | 3.1.14 | Auto-restart — restarts the server when code changes |

---

## 3. Project Structure

```
backend/
├── server.js                    # Entry point — starts the server
├── package.json                 # List of dependencies + scripts
├── .env                         # Secret configuration (DB URL, API keys)
├── prisma/
│   ├── schema.prisma            # Database schema (all tables defined here)
│   ├── migrations/              # Database change history (25 migrations)
│   └── seed.js                  # Script to populate initial demo data
├── src/
│   ├── app.js                   # Express app setup (middleware, routes)
│   ├── config/
│   │   └── prisma.js            # Prisma client initialization
│   ├── lib/                     # Shared libraries
│   │   ├── auth.js              # better-auth configuration
│   │   ├── env.js               # Environment variable validation (Zod)
│   │   ├── logger.js            # Pino logger setup
│   │   ├── mail.js              # Email sender (Nodemailer)
│   │   ├── ApiError.js          # Custom error class
│   │   ├── tenantPrisma.js      # Multi-tenant database wrapper
│   │   ├── planGate.js          # Plan limit enforcement
│   │   ├── planLimits.js        # Plan definitions (BASIC/PRO/ENTERPRISE)
│   │   └── emails/              # Email templates (invite, reset password)
│   ├── middleware/               # Request processing pipeline
│   │   ├── authMiddleware.js    # Session check — verifies user is logged in
│   │   ├── tenantMiddleware.js  # Injects tenant-scoped Prisma client
│   │   ├── rbacMiddleware.js    # Role check — verifies user has permission
│   │   ├── errorMiddleware.js   # Global error handler
│   │   └── requirePlatformAdmin.js  # Super Admin check
│   ├── routes/
│   │   └── index.js             # Route aggregator — mounts all modules
│   └── modules/                 # Feature modules (19 modules)
│       ├── auth/                # Login, signup, Google OAuth
│       ├── lead/                # Core CRM — leads CRUD, assign, import
│       ├── company/             # Company/tenant registration & profile
│       ├── user/                # User management, invites, roles
│       ├── project/             # Real estate projects
│       ├── task/                # Task/to-do management
│       ├── pipeline/            # Pipeline stages configuration
│       ├── activity/            # Activity/audit log
│       ├── note/                # Lead-scoped notes
│       ├── notification/        # In-app notifications
│       ├── file/                # File uploads & storage
│       ├── dashboard/           # Dashboard analytics
│       ├── admin/               # Platform/Super Admin
│       ├── broker/              # Broker-specific views
│       ├── leadIntake/          # Public lead intake webhooks
│       ├── integrations/        # BYO integrations (Meta, Google, etc.)
│       ├── billing/             # Subscriptions, payments, Razorpay
│       ├── contact/             # Public contact form
│       └── plan/                # Plan CRUD for Super Admin
├── scripts/                     # Utility scripts
├── tests/                       # Automated tests
└── uploads/                     # Uploaded files (local storage)
```

---

## 4. How a Request Flows

### Complete Request Lifecycle

```
Frontend (Browser)
    │
    │  GET https://api.relms.com/api/leads?status=New&page=1
    │  (with cookie: better-auth.session_token=xxx)
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1. server.js                                                    │
│    - Loads .env variables                                       │
│    - Creates Express app from src/app.js                        │
│    - Initializes better-auth (authentication library)           │
│    - Mounts auth routes at /api/auth                            │
│    - Starts background schedulers                               │
│    - Listens on port (e.g. 5000)                                │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. src/app.js — Middleware Pipeline (in order)                  │
│    a) cors()        — Allows requests from frontend URL         │
│    b) helmet()      — Security headers                          │
│    c) pinoHttp()    — Logs every request                        │
│    d) cookieParser()— Reads cookies from browser                │
│    e) JSON parser   — Reads JSON request body                   │
│    f) urlencoded    — Reads form data                           │
│    g) text parser   — Reads XML/text (for webhooks)             │
│    h) Routes        — /api/leads → lead module                  │
│    i) errorHandler  — Catches any errors                        │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. src/routes/index.js — Route Mounting                         │
│    /api/public      → contact                                   │
│    /api/leads       → lead                                      │
│    /api/company     → company                                   │
│    /api/users       → user                                      │
│    /api/projects    → project                                   │
│    /api/pipeline    → pipeline                                  │
│    /api/tasks       → task                                      │
│    /api/dashboard   → dashboard                                 │
│    /api/notifications→ notification                             │
│    /api/admin       → admin                                     │
│    /api/notes       → note                                      │
│    /api/files       → file                                      │
│    /api/broker      → broker                                    │
│    /api/intake      → leadIntake                                │
│    /api/integrations→ integrations                              │
│    /api/webhooks    → webhooks                                  │
│    /api/billing     → billing                                   │
│    /api/audit-log   → activity                                  │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. lead.routes.js — Lead Module Middleware                      │
│    a) authMiddleware    - Checks session cookie                 │
│       → Reads cookie "better-auth.session_token"                │
│       → Decodes it → finds token part                           │
│       → Looks up session in database by token                   │
│       → Checks session hasn't expired                           │
│       → Sets req.user = { id, role, companyId, ... }           │
│    b) tenantMiddleware  - Creates tenant-scoped Prisma          │
│       → Calls getTenantPrisma(req.user.companyId)               │
│       → Returns a Prisma client that auto-filters by companyId  │
│       → Sets req.tenantPrisma                                   │
│    c) requireRole("OWNER","ADMIN","MANAGER") - Checks role      │
│       → Verifies req.user.role is in the allowed list           │
│    d) Controller function                                       │
│       → e.g. getAllLeads controller                             │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. lead.controller.js — Controller Layer                        │
│    - Validates input using Zod schemas                          │
│    - Checks plan limits (assertWithinLimit)                     │
│    - Calls the service function                                 │
│    - Sends response back to frontend                            │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. lead.service.js — Service Layer (Business Logic)             │
│    - Builds database query (where, orderBy, pagination)         │
│    - Calls tenantPrisma.lead.findMany()                         │
│    - Applies PII masking for AGENT/BROKER roles                 │
│    - Logs activity                                              │
│    - Sends notifications                                        │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. Prisma → PostgreSQL                                          │
│    tenantPrisma.lead.findMany({                                  │
│      where: { status: "New", companyId: "auto-injected" },      │
│      include: { assignedTo: true },                              │
│      skip: 0, take: 20,                                         │
│      orderBy: { createdAt: "desc" }                             │
│    })                                                            │
│    → Generates SQL: SELECT * FROM Lead WHERE ...                │
│    → PostgreSQL returns rows                                    │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. Response flows back up                                       │
│    Service → masks PII → returns to Controller                  │
│    Controller → sends JSON response to browser                  │
│    Express → adds CORS headers, logs completion                 │
│    Browser → receives JSON, React renders the UI                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Database Models

### Data Types (PostgreSQL)

| Data Type | What it stores | Example |
|-----------|---------------|---------|
| `String` | Text (short) | Name, email, phone |
| `Int` | Whole number | Score, probability, age |
| `Float` | Decimal number | Budget (as number) |
| `Boolean` | True/False | isActive, isWon |
| `DateTime` | Date + time | createdAt, updatedAt |
| `Json` | Complex structured data | intakeTokens, metadata |
| `String[]` | Array of strings | tags: ["Hot", "VIP"] |
| `Enum` | Predefined set of values | Role: OWNER, ADMIN, AGENT |

### The 19 Tables (Models)

#### 1. **Company** — The tenant (each real estate company)
| Field | Type | What it stores |
|-------|------|---------------|
| `id` | String (CUID) | Unique identifier, auto-generated |
| `name` | String | Company name (e.g. "ABC Realty") |
| `type` | Enum | DEVELOPER, BROKERAGE, CHANNEL_PARTNER, INDIVIDUAL |
| `email` | String? | Company email |
| `phone` | String? | Company phone |
| `address` | String? | Physical address |
| `logoUrl` | String? | Brand logo URL |
| `brandColor` | String? | Brand color hex code |
| `timezone` | String | Default "Asia/Kolkata" |
| `currency` | String | Default "INR" |
| `subscriptionPlan` | String | "BASIC", "PRO", "ENTERPRISE" |
| `pendingPlan` | String? | Plan selected but not yet paid |
| `trialEndsAt` | DateTime? | When the 7-day trial ends |
| `onboardingCompleted` | Boolean | Has completed onboarding wizard |
| `status` | String | "ACTIVE", "SUSPENDED", "DELETED" |
| `city` | String? | City location |
| `intakeTokens` | Json | Facebook/Instagram webhook config |
| `createdAt` | DateTime | Auto-set on creation |
| `updatedAt` | DateTime | Auto-updated on every change |

#### 2. **User** — People who login
| Field | Type | What it stores |
|-------|------|---------------|
| `id` | String (CUID) | Unique identifier |
| `name` | String | Full name |
| `email` | String (unique) | Login email (globally unique) |
| `emailVerified` | Boolean | Email confirmed? |
| `image` | String? | Profile picture URL |
| `role` | Enum | OWNER, ADMIN, MANAGER, AGENT, BROKER, SUPER_ADMIN, PLATFORM_ADMIN |
| `phone` | String? | Phone number |
| `dept` | String? | Department name |
| `isActive` | Boolean | Account enabled/disabled |
| `lastLoginAt` | DateTime? | Last login timestamp |
| `deletedAt` | DateTime? | Soft-delete timestamp |
| `companyId` | String? | Which company they belong to (null for SUPER_ADMIN and BROKER) |
| `createdAt` | DateTime | Auto-set |
| `updatedAt` | DateTime | Auto-updated |

#### 3. **Lead** — The core CRM entity (a potential customer)
| Field | Type | What it stores |
|-------|------|---------------|
| `id` | String (CUID) | Unique identifier |
| `name` | String | Customer name |
| `phone` | String | Phone number |
| `email` | String? | Email address |
| `source` | String? | Where they came from (Facebook, Website, Manual, etc.) |
| `budget` | String? | Budget range as text ("₹50 L - ₹1 Cr") |
| `status` | String | Pipeline stage: "New", "Contacted", "Interested", etc. |
| `requirementType` | String? | What they want to buy |
| `assignedToId` | String? | Which user is handling this lead |
| `createdById` | String? | Who created this lead |
| `companyId` | String | Which company owns this lead |
| `city` | String? | City |
| `interestedProjectId` | String? | Which project they're interested in |
| `score` | Int? | Lead score (0-100) |
| `priority` | String? | "Hot", "Warm", "Cold" |
| `possessionTimeline` | String? | When they need possession |
| `tags` | String[] | Tags like ["VIP", "Urgent"] |
| `lastContactedAt` | DateTime? | Last customer contact |
| `nextFollowUpAt` | DateTime? | Scheduled follow-up |
| `createdAt` | DateTime | Auto-set |
| `updatedAt` | DateTime | Auto-updated |

#### 4. **Project** — Real estate projects
| Field | Type | What it stores |
|-------|------|---------------|
| `id` | String (CUID) | Unique identifier |
| `name` | String | Project name |
| `location` | String | Location/address |
| `type` | Enum | RESIDENTIAL, COMMERCIAL, PLOT, VILLA, MIXED |
| `priceRange` | String? | Price range text |
| `companyId` | String | Owning company |
| `coverImageUrl` | String? | Cover photo |
| `description` | String? | Description text |
| `reraNumber` | String? | RERA registration number |
| `possessionDate` | DateTime? | Expected possession date |

#### 5. **Task** — To-dos
| Field | Type | What it stores |
|-------|------|---------------|
| `id` | String (CUID) | Unique identifier |
| `title` | String | Task title |
| `description` | String? | Description |
| `status` | String | "PENDING" or "COMPLETED" |
| `dueAt` | DateTime? | Due date/time |
| `assignedToId` | String? | Who is responsible |
| `companyId` | String | Company |
| `leadId` | String? | Linked lead (optional) |
| `projectId` | String? | Linked project (optional) |

#### 6. **PipelineStage** — Sales pipeline stages
| Field | Type | What it stores |
|-------|------|---------------|
| `id` | String (CUID) | Unique identifier |
| `companyId` | String | Company |
| `name` | String | Stage name (New, Contacted, etc.) |
| `order` | Int | Display order |
| `probability` | Int | Win probability (%) |
| `isWon` | Boolean | This = won deal |
| `isLost` | Boolean | This = lost deal |
| `isDefault` | Boolean | System default (can't delete) |

#### 7. **Activity** — Audit trail / activity log
| Field | Type | What it stores |
|-------|------|---------------|
| `id` | String (CUID) | Unique identifier |
| `companyId` | String | Company |
| `leadId` | String? | Which lead (optional for company-level events) |
| `userId` | String? | Who performed the action |
| `type` | Enum | CALL, EMAIL, WHATSAPP, NOTE, STATUS_CHANGE, ASSIGNMENT, SYSTEM |
| `content` | String | Human-readable description |
| `metadata` | Json? | Extra data (old/new values, etc.) |
| `createdAt` | DateTime | When it happened |

#### 8. **Note** — Lead notes
| Field | Type | What it stores |
|-------|------|---------------|
| `id` | String (CUID) | Unique identifier |
| `companyId` | String | Company |
| `leadId` | String | Which lead |
| `userId` | String? | Who wrote it |
| `content` | String | Note text |
| `createdAt` | DateTime | Auto-set |
| `updatedAt` | DateTime | Auto-updated |

#### 9. **Notification** — In-app alerts
| Field | Type | What it stores |
|-------|------|---------------|
| `id` | String (CUID) | Unique identifier |
| `companyId` | String | Company |
| `userId` | String | Who gets this notification |
| `type` | String | LEAD_ASSIGNED, LEAD_CREATED, etc. |
| `title` | String | Short title |
| `body` | String? | Body text |
| `link` | String? | Deep link (e.g. "/leads/abc123") |
| `readAt` | DateTime? | When user read it (null = unread) |
| `metadata` | Json? | Extra data |

#### 10. **Invite** — User invitations
| Field | Type | What it stores |
|-------|------|---------------|
| `id` | String (CUID) | Unique identifier |
| `email` | String | Invited email |
| `role` | Role | What role they'll get |
| `companyId` | String | Which company |
| `invitedById` | String | Who sent the invite |
| `token` | String (unique) | Secret token in invite link |
| `expiresAt` | DateTime | Link expiry (7 days) |
| `acceptedAt` | DateTime? | When they accepted |

#### 11. **Session** — Login sessions
| Field | Type | What it stores |
|-------|------|---------------|
| `id` | String (CUID) | Unique identifier |
| `userId` | String | Which user |
| `token` | String (unique) | Session token |
| `expiresAt` | DateTime | When session expires |
| `ipAddress` | String? | IP of login |
| `userAgent` | String? | Browser info |

#### 12. **Account** — better-auth accounts
| Field | Type | What it stores |
|-------|------|---------------|
| `id` | String (CUID) | Unique identifier |
| `userId` | String | Which user |
| `accountId` | String | Provider account ID |
| `providerId` | String | "credential" (email/password) or "google" |
| `password` | String? | Hashed password (never plain text) |
| `accessToken` | String? | OAuth access token |
| `refreshToken` | String? | OAuth refresh token |

#### 13. **File** — Uploaded files
| Field | Type | What it stores |
|-------|------|---------------|
| `id` | String (CUID) | Unique identifier |
| `companyId` | String | Company |
| `uploaderId` | String | Who uploaded |
| `folder` | String | "general" or custom folder |
| `name` | String | Original filename |
| `mimeType` | String | "image/png", "application/pdf", etc. |
| `sizeBytes` | Int | File size in bytes |
| `storageKey` | String | Path on disk |
| `leadId` | String? | Linked lead (optional) |
| `createdAt` | DateTime | Upload time |

#### 14. **IntegrationCredential** — API connections
| Field | Type | What it stores |
|-------|------|---------------|
| `id` | String (CUID) | Unique identifier |
| `companyId` | String | Company |
| `provider` | Enum | META, GOOGLE_ADS, WEBSITE_FORM, JUSTDIAL, INDIAMART |
| `label` | String | User-friendly name |
| `credentials` | String (encrypted) | API keys encrypted with AES-256-GCM |
| `webhookToken` | String (unique) | Secret token for webhook URL |
| `status` | Enum | ACTIVE, INVALID, EXPIRED, REVOKED |
| `expiresAt` | DateTime? | When credentials expire |

#### 15. **WebhookEvent** — Received webhook payloads
| Field | Type | What it stores |
|-------|------|---------------|
| `id` | String (CUID) | Unique identifier |
| `provider` | Enum | META, GOOGLE_ADS, etc. |
| `externalId` | String | Provider's unique event ID |
| `credentialId` | String? | Which integration received it |
| `status` | String | "RECEIVED", "PROCESSED", "FAILED" |
| `rawPayload` | Json | Original webhook body |

#### 16. **Plan** — Subscription plan catalog
| Field | Type | What it stores |
|-------|------|---------------|
| `id` | String (CUID) | Unique identifier |
| `code` | String (unique) | "BASIC", "PRO", "ENTERPRISE" |
| `name` | String | "Basic", "Pro", "Enterprise" |
| `priceMonthly` | Int | Price in paise (₹2499 = 249900) |
| `priceAnnual` | Int | Per-month equivalent for annual billing |
| `limits` | Json | { users, leads, projects, storageBytes, integrations } |
| `features` | Json | Feature flags |
| `razorpayPlanIdMonthly` | String? | Razorpay plan ID for monthly billing |
| `razorpayPlanIdAnnual` | String? | Razorpay plan ID for annual billing |

#### 17. **Subscription** — Active/past subscriptions
| Field | Type | What it stores |
|-------|------|---------------|
| `id` | String (CUID) | Unique identifier |
| `companyId` | String | Company |
| `plan` | String | "PRO" or "ENTERPRISE" |
| `billingCycle` | String | "monthly" or "annual" |
| `status` | String | CREATED, ACTIVE, HALTED, CANCELLED, EXPIRED |
| `razorpaySubscriptionId` | String (unique) | Razorpay subscription reference |
| `amount` | Int | Price in paise |

#### 18. **Payment** — Payment/invoice records
| Field | Type | What it stores |
|-------|------|---------------|
| `id` | String (CUID) | Unique identifier |
| `companyId` | String | Company |
| `subscriptionId` | String? | Linked subscription |
| `razorpayPaymentId` | String (unique) | Razorpay payment reference |
| `amount` | Int | Amount in paise |
| `status` | String | "captured", "failed", "refunded" |
| `method` | String? | "card", "upi", "netbanking", "wallet" |

#### 19. **ContactSubmission** — Public contact form
| Field | Type | What it stores |
|-------|------|---------------|
| `id` | String (CUID) | Unique identifier |
| `name` | String | Person's name |
| `email` | String | Email |
| `message` | String | Their message |
| `source` | String? | Where they found us |

---

## 6. Authentication

### How Login Works (Tenant User)

```
User enters email + password on login page
    │
    ▼
POST /api/auth/sign-in  (auth.routes.js)
    │
    ▼
auth.controller.js → loginTenant()
    │
    ▼
1. Validate input with Zod
   - email: string, valid email format
   - password: string, not empty
   - companyId: optional string
    │
    ▼
2. auth.service.js → tenantLogin()
   a) Find all user rows with this email (excluding SUPER_ADMIN/PLATFORM_ADMIN)
   b) Try each user's password hash until one matches
      - Uses bcrypt-style verification via better-auth's verifyPassword
   c) If NO match → throw 401 "Invalid credentials"
   d) If MULTIPLE matches (same email in different companies)
      → throw 409 "Multiple companies match" with company list
      → Frontend shows a "which workspace?" picker
   e) If EXACTLY ONE match → proceed
    │
    ▼
3. Create a session
   a) Generate random 32-byte session token
   b) Store in Session table with 7-day expiry
   c) Create HMAC-SHA256 signature: HMAC(token, BETTER_AUTH_SECRET)
   d) Set cookie: "better-auth.session_token=<token>.<signature>"
   e) Cookie is: HttpOnly (JS can't read it), SameSite=Lax (CSRF protection),
      Path=/, Max-Age=604800 (7 days)
    │
    ▼
4. Return user info + token to frontend
   Response: { user: { id, email, role }, token: "..." }
   Set-Cookie header with session cookie
    │
    ▼
5. Browser stores cookie automatically
   Every subsequent request includes the cookie
```

### How Authentication is Checked on Every Request

```
Request comes in with cookie
    │
    ▼
authMiddleware.js
    │
    ▼
1. Read cookie: req.cookies["better-auth.session_token"]
2. If no cookie → 401 "Not authenticated"
3. Decode URI component → get "token.signature"
4. Extract token part (before the dot)
5. Look up session in database: prisma.session.findUnique({ where: { token } })
6. If no session or expired → 401 "Not authenticated"
7. Set req.user = session.user (full user object with id, role, companyId)
8. Set req.session = session
9. Call next() → proceed to the actual handler
```

### Super Admin Login

```
POST /api/auth/superadmin/login  (rate-limited: 5 attempts/minute)
    │
    ▼
1. Validate: email + password required
2. Find user with role=SUPER_ADMIN and companyId=null
3. Verify password hash directly (uses better-auth verifyPassword)
4. Create session + cookie (same mechanism as tenant login)
5. Write platform audit log: SUPER_ADMIN_LOGIN or SUPER_ADMIN_LOGIN_FAILED
```

### Google OAuth

```
GET /api/auth/google?from=/dashboard
    │
    ▼
1. Build Google OAuth URL with client ID, redirect URI, scope
2. Redirect user to Google's consent screen
3. User approves → Google redirects to /api/auth/google/callback?code=xxx
4. Backend exchanges code for tokens via Google's API
5. better-auth handles creating/updating Account + User rows
6. disableSignUp: true → only existing users can sign in with Google
7. accountLinking: if email/password user already exists, Google login
   links to that existing account (no duplicate)
```

### Password Reset

```
1. User clicks "Forgot Password"
2. better-auth generates reset token, sends email via Nodemailer
3. Email contains reset link with token
4. User clicks link → frontend redirects to reset password page
5. User enters new password → better-auth API validates + updates
```

---

## 7. Company Registration

### Self-Service Signup Flow

```
User fills signup form
    │
    ▼
POST /api/company/register  (public, no auth)
    │
    ▼
company.controller.js → register()
    │
    ▼
company.service.js → registerCompanyAndOwner()
    │
    ▼
Step-by-step:
1. Validate input:
   - companyName: string required
   - companyType: DEVELOPER | BROKERAGE | CHANNEL_PARTNER | INDIVIDUAL
   - ownerEmail: valid email, globally unique
   - password: string
   - plan: "BASIC" | "PRO" | "ENTERPRISE" (optional)
   - billingCycle: "monthly" | "annual" (optional)
    │
    ▼
2. Check no existing user with this email
   → If exists, error: "Already registered"
    │
    ▼
3. better-auth creates user account (signUpEmail)
   → Creates User row + Account row with hashed password
   → User has no companyId yet
    │
    ▼
4. Inside a database TRANSACTION (all-or-nothing):
   a) Create Company row
      - subscriptionPlan: "BASIC" (always starts on BASIC)
      - pendingPlan: "PRO" or "ENTERPRISE" if selected at signup
      - trialEndsAt: now + 7 days
      - status: "ACTIVE"
      - intakeTokens: {}
   b) Update User row
      - set companyId to the new company's id
      - set role to "OWNER"
      - set phone
   c) Create DEFAULT_STAGES (9 pipeline stages)
      - New, Contacted, Qualified, Proposal Sent, Negotiation,
        Won, Lost, Not Interested, Follow Up
    │
    ▼
5. Auto sign-in the new owner
   → better-auth API signInEmail
   → Get Set-Cookie header
    │
    ▼
6. Return: { company, user, setCookie }
   Frontend stores cookie → user is now logged in
```

### Plan-Pending Signup (Pro/Enterprise)

```
User picks "Pro" on pricing page during signup
    │
    ▼
1. Company created with:
   - subscriptionPlan: "BASIC"
   - pendingPlan: "PRO"
   - pendingBillingCycle: "monthly" (or "annual")
    │
    ▼
2. After onboarding, billing page shows "Upgrade to Pro"
   pendingPlan tells the frontend to render the Razorpay Checkout button
    │
    ▼
3. User pays → Razorpay webhook → subscriptionPlan flips to "PRO"
   pendingPlan and pendingBillingCycle set to null
```

---

## 8. User Invitation & Role Management

### Role Hierarchy

```
SUPER_ADMIN       — Platform owner (no companyId, can access everything)
PLATFORM_ADMIN    — Platform operator (can manage all companies)
    │
OWNER             — Company owner (full access within their company)
    │
ADMIN             — Company admin (manage users, leads, settings)
    │
MANAGER           — Team manager (oversee agents, assign leads)
    │
AGENT             — Sales agent (handle assigned leads, limited visibility)
    │
BROKER            — External broker (channel partner, companyId=null)
```

### Invite Flow

```
OWNER/ADMIN sends invite via email
    │
    ▼
POST /api/users/invite  (auth required, OWNER/ADMIN only)
    │
    ▼
user.service.js → createInvite()
    │
    ▼
1. Validate:
   - email: valid email, not yourself
   - role: not OWNER (can't invite owners)
   - name: optional
    │
    ▼
2. Check plan limit:
   - assertWithinLimit(companyId, "users")
   - Counts active users + pending invites (excluding brokers)
   - If at limit → 402 "Upgrade your plan to add more users"
    │
    ▼
3. Check global uniqueness:
   - If email exists in ANY company:
     → Same company: "Already in your team"
     → Different company: "Use a different email"
    │
    ▼
4. Check existing pending invite for this email
   → If exists and not expired: "Pending invite already exists"
    │
    ▼
5. Create Invite row:
   - Generate random 32-byte hex token (the secret link)
   - Set expiresAt = now + 7 days
    │
    ▼
6. Send email (fire-and-forget, doesn't block response):
   - Contains invite link: https://app.relms.com/accept-invite?token=xxx
   - Email sent via Nodemailer (Gmail SMTP)
   - If SMTP not configured → logged to console only
    │
    ▼
7. Log activity: "USER_INVITED" audit event
    │
    ▼
8. Return: { id, email, role, expiresAt, inviteLink, emailSent }
```

### Accept Invite Flow

```
Invitee clicks the link → opens browser
    │
    ▼
GET /api/users/invite/:token
    │
    ▼
1. Find invite by token
2. If not found → 404
3. If already accepted → 410 "Invite has already been accepted"
4. If expired → 410 "Invite has expired"
5. Return: { email, role, companyName, companyId }
   → Frontend shows "Join {companyName} as {role}" page
    │
    ▼
User enters name + password
    │
    ▼
POST /api/users/invite/:token/accept
    │
    ▼
1. Verify invite again (exists, not accepted, not expired)
2. Hash the password using better-auth's hashPassword
3. Inside a TRANSACTION:
   a) Create User row with the invited role + companyId
   b) Create Account row with hashed password
   c) Set emailVerified = true (invite implies verification)
4. Mark invite as accepted (acceptedAt = now)
5. Return: { user, company }
```

### Broker Invite (Special)

```
Broker invites work differently:
1. Broker has companyId = null (they're not "inside" the company)
2. Instead, BrokerCompany row links them to the company
3. If broker User already exists → reuse, just create BrokerCompany link
4. Brokers DON'T consume a user seat in plan limits
```

---

## 9. Lead Management

### Create Lead

```
POST /api/leads  (auth required, OWNER/ADMIN/MANAGER)
    │
    ▼
lead.controller.js → createLead()
    │
    ▼
1. Validate input with Zod:
   - name: string, min 1 char (required)
   - phone: string, min 10 digits, strip spaces/dashes (required)
   - email: valid email format (optional)
   - source: string (optional) — "Facebook", "Website", "Manual", etc.
   - requirementType: string (optional)
   - budget: string or number (optional) — stored as text
   - city: string (optional)
   - interestedProjectId: string (optional) — FK to Project
   - notes: string (optional) — initial note text
   - tags: string[] (optional)
   - assignedToId: string (optional)
   - status: "New" | "Contacted" | "Interested" | ...  (optional)
   - priority: "Hot" | "Warm" | "Cold" (optional)
   - possessionTimeline: string (optional)
   - nextFollowUpAt: ISO datetime (optional)
    │
    ▼
2. Check plan limit:
   - assertWithinLimit(companyId, "leads")
   - Counts total leads in company
   - BASIC max: 200 leads → throws 402 with upgrade prompt
    │
    ▼
3. Check duplicates (unless force=true):
   - Hard match: same phone OR same email (case-insensitive)
   - If found → throw 409 "Duplicate lead found"
   - Frontend shows "This looks like a duplicate. Create anyway?"
   - If user confirms → re-sends with ?force=true
    │
    ▼
4. Validate assignee belongs to this company
   - findFirst on User with tenant-scoped Prisma
   - If not found → error
    │
    ▼
5. Create Lead in database using tenant-scoped Prisma
   - companyId auto-injected by tenantPrisma extension
    │
    ▼
6. Log activity: "Lead created" (type: SYSTEM)
    │
    ▼
7. If notes provided → create Note row linked to this lead
    │
    ▼
8. Send notifications to all OWNER/ADMIN/MANAGER (except creator)
   - Type: "LEAD_CREATED"
   - Body: "John Doe — +91 98765... · by Alice"
   - Link: "/leads/{leadId}"
    │
    ▼
9. Apply PII masking if role is AGENT/BROKER
    │
    ▼
10. Return the created lead
```

### List/View Leads

```
GET /api/leads  (auth required, all roles)
    │
    ▼
Filters (all optional):
  - search: text search across name, email, phone
  - status: exact status match
  - assignedToId: filter by assignee
  - source: case-insensitive source match
  - interestedProjectId: filter by project
  - tag: filter by tag (has)
  - city: partial city match
  - priority: Hot/Warm/Cold
  - nextFollowUpFrom: date range start
  - nextFollowUpTo: date range end
  - page: page number (default 1)
  - pageSize: items per page (default 20, max 100)
  - sort: "createdAt:desc" (default), "name:asc", etc.
    │
    ▼
Role-based filtering:
  - AGENT: can ONLY see leads assigned to them (assignedToId = userId)
  - OWNER/ADMIN/MANAGER: see all leads in their company
    │
    ▼
Response:
  {
    ok: true,
    data: {
      items: [ { id, name, phone (masked for AGENT), ... } ],
      total: 342,
      page: 1,
      pageSize: 20
    }
  }
```

### View Lead Detail

```
GET /api/leads/:id  (auth required)
    │
    ▼
1. Find lead by id using tenant-scoped Prisma (findFirst, not findUnique)
2. AGENT: only if assignedToId === userId → else 404
3. Apply PII masking for AGENT/BROKER
4. Return lead with includes: assignedTo, interestedProject, activityCount
```

### Update Lead

```
PATCH /api/leads/:id  (auth required)
    │
    ▼
1. Find existing lead
2. AGENT: can only edit leads assigned to them
3. AGENT/BROKER: cannot update phone or email
   → stripRestrictedWrites() removes these fields silently
4. Update allowed fields using updateMany (companyId auto-scoped)
5. If assignedTo changed → log ASSIGNMENT activity + send notification
6. Compute changed fields → log UPDATE activity
   (tracks: name, phone, email, source, requirementType, budget, city,
    interestedProjectId, priority, possessionTimeline, nextFollowUpAt, tags)
7. Return updated lead with masking
```

### Delete Lead

```
DELETE /api/leads/:id  (auth required, OWNER/ADMIN only)
    │
    ▼
1. Find lead
2. Inside a TRANSACTION:
   a) Create activity: "Lead 'X' deleted" (this persists even after delete)
   b) Delete all notes for this lead (deleteMany)
   c) Detach tasks (set leadId = null, don't delete tasks)
   d) Detach files (set leadId = null)
   e) Delete the lead row itself
```

---

## 10. Lead Import (CSV)

```
POST /api/leads/import  (auth required, OWNER/ADMIN/MANAGER)
Body: multipart/form-data with file field "file"
    │
    ▼
1. Check plan limit remaining capacity
2. Parse CSV using csv-parse library
3. For each row:
   - Map columns by name (case-insensitive)
   - Required: name
   - Optional: phone, email, source, city, notes, tags, etc.
   - Validate each row individually
   - Check duplicates (skip if duplicate found)
   - Create lead
   - Create note if notes field present
4. Truncate at remaining plan capacity
5. Return: { imported, skipped, failed, total }
```

---

## 11. Pipeline Stages & Lead Transitions

### Default Pipeline (9 Stages)

```
1. New              (5% win probability, default)
2. Contacted        (10%)
3. Qualified        (25%)
4. Proposal Sent    (40%)
5. Negotiation      (60%)
6. Won              (100%, isWon=true)
7. Lost             (0%, isLost=true)
8. Not Interested   (0%, isLost=true)
9. Follow Up        (15%)
```

### How Lead Status Works

Leads move through pipeline stages. The `lead.status` field stores the current stage name as a string (e.g. "New", "Contacted", "Negotiation").

### Transition Lead

```
POST /api/leads/:id/transition  (auth required)
Body: { toStatus: "Negotiation", reason: "Client is interested" }
    │
    ▼
1. Find lead
2. AGENT: only assigned leads
3. If same status → return as-is (no-op)
4. If target is Lost/Not Interested → reason is REQUIRED
5. Inside a TRANSACTION:
   a) Update lead: status = toStatus, lastContactedAt = now
   b) Create activity: "Contacted → Negotiation — reason text"
   c) If assignedTo !== actor → send notification to assignee
6. Return updated lead with masking
```

### Custom Pipeline Stages

Pipeline stages are configurable per company. The OWNER can add/remove/reorder stages through the pipeline module. PRO/ENTERPRISE plans have this feature enabled.

---

## 12. Lead Privacy (PII Masking)

### Why This Exists

AGENT and BROKER roles should NOT see full phone numbers or emails. This protects customer data privacy. Only OWNER, ADMIN, MANAGER, SUPER_ADMIN, and PLATFORM_ADMIN see full contact details.

### How Masking Works

**Phone masking:**
- "+919876543210" → "+91 98765 XXXXX"
- "9876543210" → "98765 XXXXX"
- First 5 digits visible, last 5 digits replaced with "XXXXX"

**Email masking:**
- "john.doe@example.com" → "j******e@example.com"
- First and last character of local part visible, middle replaced with asterisks
- Domain is always visible

### Where Masking is Applied

Masking happens at EVERY return path:
- List leads → maskLeadListForRole()
- Lead detail → maskLeadForRole()
- Create response → maskLeadForRole()
- Update response → maskLeadForRole()
- Duplicate check → maskDuplicateMatchesForRole()
- Auto-assign → maskLeadForRole()
- Transition → maskLeadForRole()

Additionally, AGENT/BROKER cannot WRITE phone/email fields:
- `stripRestrictedWrites()` removes phone/email from update payload
- This prevents the masked "XXXXX" string from overwriting the real number

### Click-to-Call

Instead of seeing the raw number, AGENT sees a "Call" button that:
1. Logs a CALL activity
2. Updates lastContactedAt
3. Returns a callId
4. (Future) Triggers autodialer via Twilio/Exotel

---

## 13. Duplicate Detection

### How Duplicate Detection Works

```
POST /api/leads/check-duplicates
Body: { phone, email, name, city }  (at least phone or email)
    │
    ▼
1. HARD match: exact phone match OR case-insensitive email match
   → These are considered definite duplicates
2. SOFT match: name contains + city equals (case-insensitive)
   → Excludes hard matches
   → Limited to 5 results
    │
    ▼
Both hard and soft results are masked for AGENT/BROKER
    │
    ▼
Response:
{
  hard: [{ id, name, phone, email, status, assignedTo }],
  soft: [{ id, name, phone, email, status, assignedTo }]
}
```

### Where Dedup is Used

1. **Create Lead** — checks before creating; throws 409 if hard match found
2. **CSV Import** — checks each row; skips duplicates
3. **Lead Intake Webhooks** (Facebook/Instagram) — if existing lead found,
   appends note + activity instead of creating duplicate

---

## 14. Lead Assignment

### Manual Assignment

```
POST /api/leads/:id/assign
Body: { assignedToId: "user_abc123", reason: "Best fit for this region" }
    │
    ▼
1. assignedToId = null → unassign the lead
2. Verify target user exists in same company
3. Inside TRANSACTION:
   a) Update lead.assignedToId
   b) Create ASSIGNMENT activity
4. Notify new assignee (if not self-assign)
5. Return lead with masking
```

### Bulk Assignment

```
POST /api/leads/bulk-assign  (OWNER/ADMIN/MANAGER)
Body: { leadIds: ["...", "..."], assignedToId: "...", reason: "..." }
    │
    ▼
1. Verify target user
2. Loop through each leadId → call assignLeadService
3. Collect successCount + failures
4. Return results summary
```

### Auto-Assignment (Round-Robin)

```
POST /api/leads/auto-assign  (OWNER/ADMIN/MANAGER)
Body: { leadIds: ["...", "..."] }  (optional — if empty, assigns ALL unassigned)
    │
    ▼
1. Find all active AGENT + MANAGER users
2. Count current workload per agent (groupBy on lead.assignedToId)
3. Sort agents by workload (lowest first)
4. For each unassigned lead (or specified leads):
   a) Assign to the least-loaded agent
   b) Create ASSIGNMENT activity
   c) Send notification
   d) Increment that agent's virtual workload count
5. Return assignments summary
```

---

## 15. Lead Aging

### What is Lead Aging?

Leads that haven't been contacted in a while are "aging" — they're getting cold. The system tracks this and surfaces aging leads.

### How it Works

**Background scheduler** (runs every 6 hours):
1. Finds all leads where lastContactedAt > AGING_DAYS (default 7) or never contacted
2. Creates an activity for each aging lead: type = "LEAD_AGING"
3. Marks them in the system

**API endpoint:**
```
GET /api/leads/aging?days=7
```
Returns leads that haven't been contacted in `days` days.

---

## 16. Click-to-Call

### How it Works

```
POST /api/leads/:id/call  (auth required)
    │
    ▼
1. Verify lead exists
2. AGENT: only assigned leads
3. Verify lead has a phone number
4. Inside TRANSACTION:
   a) Create CALL activity with callId
   b) Update lastContactedAt = now
5. Return: { callId, status: "INITIATED" }
   (Actual dialer integration is a stub — TODO for future)
```

**IMPORTANT:** The phone number is NEVER sent to the frontend for AGENT/BROKER. The call is initiated server-side.

---

## 17. Tasks

### Task Model

Tasks are simple to-dos that can be linked to leads or projects.

| Field | Description |
|-------|-------------|
| `title` | Task name (required) |
| `description` | Details (optional) |
| `status` | "PENDING" or "COMPLETED" |
| `dueAt` | Due date/time |
| `assignedToId` | Responsible user |
| `leadId` | Linked lead (optional) |
| `projectId` | Linked project (optional) |

### Task Endpoints

```
GET    /api/tasks           — List tasks (with filters + buckets)
POST   /api/tasks           — Create task
GET    /api/tasks/:id       — Get task detail
PATCH  /api/tasks/:id       — Update task
DELETE /api/tasks/:id       — Delete task (OWNER/ADMIN)
POST   /api/tasks/:id/complete — Mark complete
```

### Task Buckets (Smart Filters)

Tasks can be viewed in "buckets":
- **today** — due today, not completed
- **overdue** — past due, not completed
- **upcoming** — due within 7 days
- **completed** — all completed tasks

### Agent Task Filtering

AGENT role: by default, only sees tasks assigned to them (unless `assignedTo=all` is specified).

---

## 18. Projects

Real estate projects that leads can be interested in.

### Project Endpoints

```
GET    /api/projects        — List projects
POST   /api/projects        — Create (OWNER/ADMIN/MANAGER)
GET    /api/projects/:id    — Get detail
PATCH  /api/projects/:id    — Update (OWNER/ADMIN/MANAGER)
DELETE /api/projects/:id    — Delete (OWNER/ADMIN)
```

### Project Types

- RESIDENTIAL — Apartments, housing
- COMMERCIAL — Office spaces, shops
- PLOT — Land/plots
- VILLA — Independent villas
- MIXED — Mixed-use development

---

## 19. Notes & Activity Log

### Lead Notes

```
POST /api/notes
Body: { leadId, content }
```
Notes are scoped to a lead. When created, a NOTE activity is also logged.

### Activity Log (Company Audit)

```
GET /api/audit-log  (auth required, OWNER/ADMIN)
```
Returns the company-wide activity feed. Filters:
- userId, type, dateFrom, dateTo
- Paginated (default 30 per page)

### Lead Activity

```
GET /api/leads/:leadId/activity
```
Returns activity for a specific lead:
- CALL, EMAIL, WHATSAPP, NOTE, STATUS_CHANGE, ASSIGNMENT, SYSTEM, LEAD_CREATED, LEAD_IMPORTED, LEAD_AGING

### Activity Logging

Every significant action creates an Activity row:
- Lead created → SYSTEM activity
- Lead updated → SYSTEM activity with change details
- Lead assigned → ASSIGNMENT activity
- Lead status changed → STATUS_CHANGE activity
- Call initiated → CALL activity
- Lead deleted → SYSTEM activity (inside transaction before deletion)

---

## 20. Notifications

### Notification Types

| Type | When it fires |
|------|---------------|
| `LEAD_CREATED` | A new lead is created (manual or via webhook) |
| `LEAD_ASSIGNED` | A lead is assigned to a user |
| `LEAD_STATUS_CHANGED` | A lead's status is changed by someone else |
| `LEAD_AGING` | A lead hasn't been contacted (future) |
| `NOTE_MENTION` | Someone mentions a user in a note (future) |

### How Notifications Work

```javascript
// notify.js — simple fire-and-forget
await tenantPrisma.notification.create({
  data: { userId, type, title, body, link, metadata }
});
```

- Notifications are stored in the database
- Frontend polls for unread notifications
- Mark as read: `PATCH /api/notifications/:id/read`
- Count: `GET /api/notifications/unread-count`

---

## 21. File Upload

### How File Upload Works

```
POST /api/files  (auth required, multipart/form-data)
Body: file (the actual file), folder (optional, default "general"), leadId (optional)
    │
    ▼
1. Multer middleware receives file (max 10MB, stored in memory buffer)
2. Determine folder: "general" or user-specified
3. Generate unique filename: ${folder}/${date}/${uuid}.${ext}
4. Save file to disk at: uploads/${companyId}/${folder}/${filename}
5. Create File record in database with metadata
```

### File Endpoints

```
GET    /api/files           — List files (filter by folder, paginated)
GET    /api/files/folders   — List unique folders
GET    /api/files/usage     — Total storage used
POST   /api/files           — Upload file
GET    /api/files/:id/download — Download file
DELETE /api/files/:id       — Delete file (OWNER/ADMIN only)
```

### Storage Limits

File storage is tracked against plan limits:
- BASIC: 500 MB
- PRO: 5 GB
- Enterprise: Unlimited

---

## 22. Multi-Tenancy Architecture

### What is Multi-Tenancy?

Multiple companies (tenants) share one database, but each company can ONLY see its own data. This is like an apartment building where each tenant has their own locked apartment but shares the same building.

### How it Works

**The Problem:**
A user from Company A should NEVER see Company B's leads.

**The Solution — `tenantPrisma.js`:**

All service files that access tenant data use `getTenantPrisma(companyId)` instead of the raw Prisma client.

```javascript
// tenantPrisma.js uses Prisma's $extends to auto-inject companyId
function getTenantPrisma(companyId) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // For FIND operations: adds companyId to the WHERE clause
          // For CREATE operations: adds companyId to the data
          return query(args);
        },
      },
    },
  });
}
```

**What this means:**
- Every `findMany()` automatically becomes `WHERE companyId = 'xxx'`
- Every `create()` automatically inserts `companyId = 'xxx'`
- Models NOT in the tenant list (e.g. `Company`, `Plan`) pass through unchanged

**Enforcement:**
A Jest test (`no-raw-prisma-in-controllers.test.js`) scans all controller files and FAILS if any imports raw prisma directly. Controllers MUST use `req.tenantPrisma`.

### Tenant Models (10 models that get automatic companyId injection)

1. User
2. Lead
3. Project
4. Task
5. Activity
6. Note
7. PipelineStage
8. Notification
9. File

---

## 23. Role-Based Access Control (RBAC)

### Middleware Chain

```
Route → authMiddleware → tenantMiddleware → requireRole → controller
```

### How Roles Are Checked

```javascript
// rbacMiddleware.js
const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: "Access Denied" });
  }
  next();
};
```

### Per-Endpoint Role Requirements

| Endpoint | Who Can Access |
|----------|---------------|
| POST /api/leads | OWNER, ADMIN, MANAGER |
| GET /api/leads | All roles (AGENT sees only assigned) |
| PATCH /api/leads/:id | All roles (AGENT sees only assigned) |
| DELETE /api/leads/:id | OWNER, ADMIN |
| POST /api/users/invite | OWNER, ADMIN |
| GET /api/company/me | OWNER, ADMIN, MANAGER, AGENT |
| PATCH /api/company/me | OWNER, ADMIN |
| GET /api/admin/* | SUPER_ADMIN, PLATFORM_ADMIN |
| GET /api/broker/* | BROKER only |

### Platform Admin Check

```javascript
function requirePlatformAdmin(req, res, next) {
  if (req.user?.role !== "PLATFORM_ADMIN" && req.user?.role !== "SUPER_ADMIN") {
    return res.status(403).json(...);
  }
  next();
}
```

---

## 24. Plan System

### The 3 Plans

| Feature | BASIC (Free) | PRO (₹2,499/mo) | ENTERPRISE (₹8,999/mo) |
|---------|-------------|-----------------|----------------------|
| Users | 3 | 10 | Unlimited |
| Leads | 200 | 10,000 | Unlimited |
| Projects | 2 | 25 | Unlimited |
| Storage | 500 MB | 5 GB | Unlimited |
| Integrations | ❌ | ✅ | ✅ |
| Custom Pipeline | ❌ | ✅ | ✅ |
| Lead Aging | ❌ | ✅ | ✅ |
| Webhook Intake | ❌ | ✅ | ✅ |
| Duplicate Detection | ❌ | ✅ | ✅ |
| Agent PII Privacy | ❌ | ✅ | ✅ |
| Audit Log | ❌ | ❌ | ✅ |
| Trial | 7 days | — | — |

### Plan Enforcement (planGate.js)

**`assertWithinLimit(companyId, resource, increment)`**
- Called before creating leads, users, projects, etc.
- Checks both trial expiry AND plan cap
- BASIC with expired trial → 402 "Trial expired"
- BASIC at 200 leads → 402 "Upgrade to add more leads"
- Throws structured error with `{ code: "PLAN_LIMIT_EXCEEDED", details: { resource, limit, current } }`

**`assertFeatureEnabled(companyId, feature)`**
- Called before using premium features
- PRO trying to use audit log → 402 "Plan doesn't include audit log"

**`assertTrialActive(companyId)`**
- Called before EVERY gated write
- Checks if BASIC plan's trialEndsAt has passed
- Throws 402 "Trial ended" (caught by all assertWithinLimit calls)

**`remainingCapacity(companyId, resource)`**
- Used for bulk operations (CSV import)
- Returns remaining count before hitting the cap

---

## 25. Billing & Razorpay

### Subscription Flow

```
1. User selects Pro on pricing page
        │
        ▼
2. POST /api/billing/subscriptions  { plan: "PRO", billingCycle: "monthly" }
        │
        ▼
3. Backend:
   a) Gets Razorpay plan ID (from DB Plan row or env var)
   b) Calls Razorpay API to create subscription
   c) Creates local Subscription row (status: "CREATED")
   d) Cancels any previous CREATED subscriptions for this tenant
   e) Returns { razorpaySubscriptionId, shortUrl }
        │
        ▼
4. Frontend opens Razorpay Checkout with the subscription ID
   User enters payment details on Razorpay's page
        │
        ▼
5. Razorpay processes payment
        │
        ▼
6. Razorpay sends webhook POST to /api/billing/webhooks/razorpay
   (no auth — verified by HMAC-SHA256 signature)
        │
        ▼
7. Backend verifies signature using RAZORPAY_WEBHOOK_SECRET
        │
        ▼
8. Acknowledge webhook immediately (prevent Razorpay retries)
        │
        ▼
9. Process webhook event:
   - subscription.activated → set Subscription status = ACTIVE
     → SET company.subscriptionPlan = "PRO"
     → CLEAR company.pendingPlan and pendingBillingCycle
     → Record Payment row
   - subscription.cancelled → set status = CANCELLED
     → IF no other ACTIVE subscription → SET company.subscriptionPlan = "BASIC"
   - subscription.charged → record payment
   - payment.captured → record payment row
```

### Razorpay Webhook Security

```
1. Raw body captured by app.js (verify function in JSON parser)
2. Signature verified: HMAC-SHA256(webhook_secret, raw_body)
3. Timing-safe comparison prevents timing attacks
4. No authentication middleware — signature IS the authentication
```

### Trial Reminder Scheduler

Every 6 hours, checks for companies whose trial expires in < 24 hours and sends a reminder email.

---

## 26. Platform Admin (Super Admin)

### Who are Platform Admins?

SUPER_ADMIN and PLATFORM_ADMIN roles manage the entire platform — all companies, all users, all data.

### Admin Endpoints

```
GET    /api/admin/stats          — Platform stats (total companies, MRR, signups)
GET    /api/admin/companies      — List all companies (paginated, filterable)
POST   /api/admin/companies      — Create company (sends owner invite)
GET    /api/admin/companies/:id  — Company detail
PATCH  /api/admin/companies/:id  — Suspend/activate company
DELETE /api/admin/companies/:id  — Soft-delete company
GET    /api/admin/signups/recent — Recent signups
GET    /api/admin/signups/weekly — Weekly signup chart
GET    /api/admin/health         — System health (DB, email, storage)
GET    /api/admin/activity       — Recent platform activity
GET    /api/admin/subscriptions  — All subscriptions
GET    /api/admin/users          — All users across companies
GET    /api/admin/users/:id      — User detail
PATCH  /api/admin/users/:id      — Suspend/activate user
GET    /api/admin/audit-log      — Platform audit trail
GET    /api/admin/plans          — Plan catalog (CRUD)
GET    /api/admin/invoices       — All payments/invoices
```

### Health Check

```
GET /api/admin/health
Response:
{
  apiUptime: "2d 14h",
  database: "healthy" | "degraded" | "down",
  databaseLatencyMs: 12,
  emailService: "healthy" | "degraded" | "down",
  emailMode: "smtp" | "console",
  storage: { usedBytes, quotaBytes, usedPct },
  jobs: { queued: 0 }
}
```

Metrics are cached for 30 seconds to avoid hammering the database and SMTP server.

---

## 27. Lead Intake Webhooks (Facebook/Instagram)

### How Lead Intake Works

Companies can receive leads directly from Facebook Lead Ads or Instagram.

### Setup

1. OWNER goes to Settings → Lead Intake
2. Toggles Facebook ON → system generates:
   - `token`: public identifier in the URL
   - `secret`: private HMAC key
3. Owner copies the webhook URL: `https://api.relms.com/api/intake/facebook/<token>`
4. Pastes this URL into Facebook's Lead Ads webhook settings

### Webhook Flow

```
Facebook sends lead data → POST /api/intake/facebook/<token>
    │
    ▼
1. Rate limited: 60 requests/minute per IP, 30/minute per token
2. Resolve company by scanning all intakeTokens JSON
   (finds the company that has this token for this source)
3. Verify HMAC-SHA256 signature (Facebook's x-hub-signature-256 header)
4. Parse Facebook's nested payload format to extract:
   { name, phone, email, city, notes }
5. Dedup: check if lead with same phone/email exists
   → If duplicate: append note + activity, return { deduped: true }
   → If new: create lead, add initial note, log activity, notify admins
6. Return success
```

### Key Files

- `leadIntake.service.js` — Token management, HMAC verification, payload parsing
- `leadIntake.routes.js` — Routes with rate limiting
- `leadIntake.controller.js` — Controller functions

The `intakeTokens` JSON on the Company model looks like:
```json
{
  "facebook": {
    "token": "abc123...",
    "secret": "xyz789...",
    "enabled": true
  },
  "instagram": {
    "token": "def456...",
    "secret": "uvw012...",
    "enabled": false
  }
}
```

---

## 28. Integrations Framework (BYO)

### What are Integrations?

Companies can connect their own third-party accounts (Meta, Google Ads, JustDial, IndiaMART, Website forms) to automatically ingest leads.

### Supported Providers

| Provider | Type | How it works |
|----------|------|-------------|
| META | Webhook | Facebook/Instagram sends leads to our webhook URL |
| GOOGLE_ADS | Webhook | Google Ads sends leads |
| WEBSITE_FORM | Webhook | Company's website form sends leads |
| JUSTDIAL | Polling | We periodically pull leads from JustDial's API |
| INDIAMART | Polling | We periodically pull leads from IndiaMART's API |

### Architecture

Each company creates IntegrationCredential rows with:
- `provider`: which service
- `label`: friendly name (e.g. "Main Facebook Page")
- `credentials`: **encrypted** API keys (AES-256-GCM)
- `status`: ACTIVE | INVALID | EXPIRED | REVOKED

### Credential Encryption

```
encrypt.js — AES-256-GCM symmetric encryption
    │
    ▼
- Key: 32 random bytes, base64-encoded, stored in INTEGRATION_ENCRYPTION_KEY
- Format: "v1:<iv_base64>:<authTag_base64>:<ciphertext_base64>"
- Each encryption generates a new random IV (initialization vector)
- Authentication tag prevents tampering
- Decrypt on read, encrypt on write
```

### Webhook Token

Each integration gets a unique `webhookToken` for its BYO webhook URL:
```
https://api.relms.com/api/webhooks/<slug>/byo/<webhookToken>
```
- `slug`: "meta", "google", "website", "justdial", "indiamart"

### Integration Endpoints

```
GET    /api/integrations          — List company's integrations
POST   /api/integrations          — Create (store encrypted credentials)
PATCH  /api/integrations/:id      — Update
DELETE /api/integrations/:id      — Delete
POST   /api/integrations/:id/test — Test connection
GET    /api/integrations/stats    — Stats across all integrations
GET    /api/integrations/:id/events — Recent webhook events
```

---

## 29. Webhooks System

### Architecture

```
External service → POST /api/webhooks/<slug>/byo/<token>
    │
    ▼
1. Match slug to provider (meta → META, google → GOOGLE_ADS, etc.)
2. Find IntegrationCredential by webhookToken
3. Verify request signature (HMAC over raw body)
4. Store raw payload in WebhookEvent table (dedup by provider+externalId)
5. Process payload through provider-specific driver
6. Create lead in the company's tenant
7. Return success
```

### Deduplication

WebhookEvent has `@@unique([provider, externalId])` so duplicate webhooks are silently ignored. The externalId is the provider's own event ID.

---

## 30. Broker Role

### What is a Broker?

A **broker** (or channel partner) is an external agent who brings leads to a real estate company but isn't an employee of that company. Unlike regular users:

- **companyId = null** — they're not inside the company
- **BrokerCompany** — join table links broker to companies they work with
- Can work with **multiple companies** simultaneously
- **Don't consume user seats** in plan limits
- Have **PII masked** like AGENT (can't see full phone/email)

### Broker Endpoints

```
GET /api/broker/companies    — Which companies this broker is linked to
GET /api/broker/dashboard    — Dashboard stats across linked companies
GET /api/broker/leads        — Leads from linked companies (PII masked)
GET /api/broker/leads/:id    — Lead detail (PII masked)
```

### How Brokers See Leads

Brokers see leads across all companies they're linked to. The BrokerCompany status controls access:
- INVITED → pending acceptance
- ACTIVE → can see leads
- REVOKED → access removed

---

## 31. Background Schedulers

### 1. Lead Aging Tick (Every 6 hours)

```
leadAging.scheduler.js
    │
    ▼
- Runs runAgingTick()
- Finds leads not contacted in AGING_DAYS (default 7)
- Logs LEAD_AGING activity for each
- First run: 60 seconds after server starts
```

### 2. Integration Pull Poller (Every 60 seconds)

```
integrations/pollers/scheduler.js
    │
    ▼
- For JUSTDIAL and INDIAMART providers (pull-based)
- Reads all ACTIVE credentials
- Calls provider API to fetch new leads
- Creates leads via ingest service
- Deduplicates by externalId
```

### 3. Integration Health Check (Every 1 hour)

```
integrations/pollers/healthCheck.scheduler.js
    │
    ▼
- Probes all integrations for credential expiry
- Updates status to EXPIRED if credentials have expired
- Marks INVALID if test connection fails
```

### 4. Trial Reminder (Every 6 hours)

```
billing/trialReminder.scheduler.js
    │
    ▼
- Finds BASIC plan companies whose trial ends in < 24 hours
- Sends reminder email to the owner
```

---

## 32. Error Handling

### ApiError Class

```javascript
class ApiError extends Error {
  constructor(statusCode, message, details) {
    this.statusCode = statusCode;  // 400, 401, 403, 404, 409, 500, etc.
    this.code = details?.code;     // UNAUTHORIZED, PLAN_LIMIT_EXCEEDED, etc.
    this.details = details;        // Extra data for frontend
  }
}
```

### Common Error Codes

| HTTP Status | Code | Meaning |
|------------|------|---------|
| 400 | — | Bad input (validation failed) |
| 401 | UNAUTHORIZED | Not logged in or invalid credentials |
| 403 | FORBIDDEN | Wrong role for this action |
| 404 | — | Resource not found |
| 409 | LEAD_DUPLICATE | Duplicate lead found |
| 409 | COMPANY_PICK_REQUIRED | Multiple companies match email |
| 402 | PLAN_LIMIT_EXCEEDED | Hit plan cap (leads, users, etc.) |
| 402 | TRIAL_EXPIRED | 7-day trial has ended |
| 402 | PLAN_FEATURE_LOCKED | Feature not in current plan |
| 413 | FILE_TOO_LARGE | Upload exceeds size limit |
| 429 | — | Rate limit exceeded |
| 500 | 500 | Internal server error (bug) |
| 502 | — | External service failed (Razorpay) |
| 503 | BILLING_NOT_CONFIGURED | Razorpay keys not set |

### Error Handler (errorMiddleware.js)

The global error handler catches:
1. **ApiError** → returns structured `{ ok: false, error: { code, message, details } }`
2. **Multer errors** → file too large → 413
3. **HTTP errors** (status 400-499) → client error
4. **Everything else** → 500 Internal Server Error (logged with stack trace)

---

## 33. Security Practices

### 1. Session Security
- Session tokens are random 32-byte values
- HMAC-signed cookies prevent tampering
- HttpOnly flag prevents JavaScript access
- SameSite=Lax prevents CSRF
- Sessions expire after 7 days

### 2. Password Security
- Passwords hashed via better-auth (bcrypt-style)
- Never stored in plain text
- Change password requires current password verification

### 3. Request Validation
- ALL input validated with Zod schemas before use
- String sanitization (spaces removed from phone)
- Type coercion (numbers → strings as needed)

### 4. Multi-Tenant Isolation
- tenantPrisma auto-injects companyId
- Tests enforce no raw Prisma in controllers
- findFirst (tenant-scoped) used instead of findUnique (not scoped)

### 5. Role Enforcement
- Every endpoint has explicit role requirements
- AGENT sees only assigned leads (IDOR protection at both list + detail level)
- AGENT can't write phone/email fields
- PII masking at every return path

### 6. Webhook Security
- HMAC signature verification for Facebook intake
- HMAC signature verification for Razorpay webhooks
- Raw body capture for signature computation
- Timing-safe comparison functions

### 7. Credential Storage
- API keys encrypted with AES-256-GCM
- Encryption key loaded from env variable (not in code)
- Each encryption uses random IV

### 8. Rate Limiting
- 5 attempts/minute for super admin login
- 60 requests/minute for intake webhooks
- 30 requests/minute per intake token

### 9. CORS
- Only configured frontend origins allowed
- Development mode allows any localhost
- Server-to-server requests (no origin) allowed

### 10. Headers
- Helmet middleware sets security headers
- Prevents clickjacking, XSS, MIME sniffing

---

## 34. Glossary

| Term | Meaning |
|------|---------|
| **API** | Application Programming Interface — how different software talks to each other |
| **Endpoint** | A specific URL that does one thing (e.g., `POST /api/leads` = create lead) |
| **CRUD** | Create, Read, Update, Delete — the four basic operations |
| **ORM** | Object-Relational Mapping — code that lets us use the database with JavaScript objects |
| **Prisma** | Our ORM — turns `prisma.lead.findMany()` into `SELECT * FROM leads` |
| **Migration** | A controlled change to the database structure (adding a column, creating a table) |
| **Middleware** | Code that runs in the middle of a request (before the final handler) |
| **Controller** | The function that handles a specific route, validates input, calls service |
| **Service** | The function containing business logic and database queries |
| **Schema** | The structure definition (what fields, what types, what's required) |
| **Validation** | Checking that data matches expected format before using it |
| **Tenant** | A customer/company that uses our platform (each has isolated data) |
| **Multi-Tenancy** | One app serving many customers with data isolation |
| **PII** | Personally Identifiable Information (phone numbers, emails) |
| **PII Masking** | Hiding parts of sensitive data (e.g., "98765 XXXXX") |
| **IDOR** | Insecure Direct Object Reference — a security hole where you can access data by guessing IDs |
| **HMAC** | Hash-based Message Authentication Code — a signature that proves data hasn't been tampered with |
| **JWT/Session Token** | A secret string that proves who you are |
| **CORS** | Cross-Origin Resource Sharing — browser security that controls which websites can call our API |
| **CSRF** | Cross-Site Request Forgery — an attack where another site makes requests on your behalf |
| **RBAC** | Role-Based Access Control — permissions based on user roles |
| **SaaS** | Software as a Service — our product model (pay monthly) |
| **MRR** | Monthly Recurring Revenue — total subscription revenue per month |
| **Paise** | Indian currency subunit (₹1 = 100 paise). We store prices in paise to avoid floating-point issues |
| **CUID** | Collision-resistant Unique IDentifier — like a random ID that won't collide with others |
| **ISO Date** | Date format: "2026-05-22T10:30:00.000Z" (international standard) |
| **AES-256-GCM** | Advanced Encryption Standard — a strong encryption algorithm |
| **Autodialer** | A system that automatically dials phone numbers and connects calls |
| **RERA** | Real Estate Regulatory Authority — Indian real estate regulation |
