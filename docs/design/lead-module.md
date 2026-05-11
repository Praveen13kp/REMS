# Lead Module Design

## Lead Lifecycle (9 stages)

| #   | Stage                 | MVP | Description                                | isWon | isLost |
| --- | --------------------- | --- | ------------------------------------------ | ----- | ------ |
| 1   | New                   | Yes | Lead created, not yet contacted            |       |        |
| 2   | Contacted             | Yes | Initial outreach done                      |       |        |
| 3   | Qualified             | Yes | Lead meets qualification criteria          |       |        |
| 4   | Site Visit Scheduled  | Yes | Site visit appointment booked              |       |        |
| 5   | Site Visit Done       | Yes | Site visit completed                       |       |        |
| 6   | Negotiation           | Yes | Price/terms discussion underway            |       |        |
| 7   | Booked                | Yes | Booking amount collected                   |       |        |
| 8   | Closed Won            | Yes | Deal closed successfully                   | ✓     |        |
| 9   | Closed Lost           | Yes | Deal lost                                  |       | ✓      |

All 9 stages are seeded per-company on registration. Stages 8 and 9 are terminal — no transitions out.

## Data Model (Lead)

```
Lead {
  id                  String    @id @default(cuid())
  companyId           String
  name                String
  phone               String
  email               String?
  source              String?          // "website", "referral", "walk-in", "call", "whatsapp", etc.
  requirementType     String?          // "1BHK", "2BHK", "3BHK", "Penthouse", "Villa", etc.
  budget              Decimal?         // max budget
  city                String?
  interestedProjectId String?          // FK to Project
  assignedToId        String?          // FK to User
  status              String           // references PipelineStage.name (denormalized for query speed)
  score               Int?             // lead score (0-100)
  tags                String[]
  notes               String?          // free-text notes on the lead
  lastContactedAt     DateTime?
  createdAt           DateTime
  updatedAt           DateTime

  // Relations
  assignedTo          User?
  interestedProject   Project?
  activities          Activity[]
  tasks               Task[]
}
```

**Status field:** Stored as a string (matching `PipelineStage.name`). The `PipelineStage` model is the source of truth for allowed values. This avoids a hard FK during MVP while keeping the door open for future normalization.

## API Endpoints

### Base URL: `/api/leads`

All endpoints require authentication. Tenant isolation via `companyId` scope.

---

### `GET /api/leads`

List leads with filtering, search, and pagination.

**Query Parameters:**

| Param               | Type   | Description                                    |
| ------------------- | ------ | ---------------------------------------------- |
| `search`            | string | Searches name, email, phone (contains, CI)     |
| `status`            | string | Filter by stage name                           |
| `assignedToId`      | string | Filter by assignee                             |
| `source`            | string | Filter by source                               |
| `interestedProjectId` | string | Filter by project                            |
| `tag`               | string | Filter by tag (comma-separated for multiple)   |
| `city`              | string | Filter by city                                 |
| `page`              | number | Page number (default 1)                        |
| `pageSize`          | number | Items per page (default 20, max 100)           |
| `sort`              | string | Sort field+dir: `createdAt:desc`, `createdAt:asc`, `updatedAt:desc`, `name:asc` |

**Role-based scoping:**
- AGENT: sees only leads where `assignedToId === currentUser.id`
- OWNER / ADMIN / MANAGER: sees all leads in the company

**Response `200`:**

```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "id": "clx...",
        "name": "John Doe",
        "phone": "+919876543210",
        "email": "john@example.com",
        "source": "website",
        "status": "New",
        "city": "Mumbai",
        "budget": 7500000,
        "score": 65,
        "tags": ["hot", "sms-opt-in"],
        "assignedTo": { "id": "usr...", "name": "Agent Smith" },
        "interestedProject": { "id": "prj...", "name": "Acme Heights" },
        "createdAt": "2026-05-10T08:00:00Z",
        "updatedAt": "2026-05-10T10:30:00Z"
      }
    ],
    "total": 42,
    "page": 1,
    "pageSize": 20
  }
}
```

---

### `POST /api/leads`

Create a new lead.

**Request Body:**

```json
{
  "name": "John Doe",
  "phone": "+919876543210",
  "email": "john@example.com",
  "source": "website",
  "requirementType": "2BHK",
  "budget": 7500000,
  "city": "Mumbai",
  "interestedProjectId": "prj...",
  "notes": "Called twice, very interested",
  "tags": ["hot"],
  "assignedToId": "usr..."
}
```

All fields except `name` and `phone` are optional. Defaults: `status = "New"`, `assignedToId = req.user.id` (creator assumes ownership if not explicitly set).

**Dedup check on create:** If a hard duplicate exists (same phone or email), returns `409` unless `?force=true` is passed. See dedup section below.

**Response `201`:**

```json
{
  "ok": true,
  "data": {
    "id": "clx...",
    "name": "John Doe",
    "phone": "+919876543210",
    "email": "john@example.com",
    "status": "New",
    "assignedTo": { "id": "usr...", "name": "Agent Smith" },
    "createdAt": "2026-05-10T08:00:00Z"
  }
}
```

---

### `GET /api/leads/:id`

Get a single lead by ID.

**Response `200`:**

```json
{
  "ok": true,
  "data": {
    "id": "clx...",
    "name": "John Doe",
    "phone": "+919876543210",
    "email": "john@example.com",
    "source": "website",
    "status": "New",
    "city": "Mumbai",
    "budget": 7500000,
    "requirementType": "2BHK",
    "score": 65,
    "tags": ["hot"],
    "lastContactedAt": null,
    "notes": "Called twice",
    "assignedTo": { "id": "usr...", "name": "Agent Smith" },
    "interestedProject": { "id": "prj...", "name": "Acme Heights" },
    "_count": { "activities": 3 },
    "createdAt": "2026-05-10T08:00:00Z",
    "updatedAt": "2026-05-10T10:30:00Z"
  }
}
```

**Response `404`:**

```json
{
  "ok": false,
  "error": { "code": "NOT_FOUND", "message": "Lead not found" }
}
```

---

### `PATCH /api/leads/:id`

Partial update. **Does NOT allow updating `status`** — status changes go through `POST /api/leads/:id/transition` (pipeline module).

**Request Body:**

```json
{
  "name": "John Updated",
  "email": "john.new@example.com",
  "tags": ["hot", "vip"]
}
```

**Response `200`:**

```json
{
  "ok": true,
  "data": {
    "id": "clx...",
    "name": "John Updated",
    "email": "john.new@example.com",
    ...rest
  }
}
```

**Response `400` (if status in body):**

```json
{
  "ok": false,
  "error": {
    "code": "FIELD_NOT_ALLOWED",
    "message": "Use /api/leads/:id/transition to change lead status"
  }
}
```

---

### `DELETE /api/leads/:id`

Delete a lead. **OWNER/ADMIN only.**

**Response `200`:**

```json
{
  "ok": true,
  "data": { "message": "Lead deleted" }
}
```

---

### `POST /api/leads/:id/assign`

Assign (or reassign) a lead to a user.

**Request Body:**

```json
{
  "assignedToId": "usr..."
}
```

**Response `200`:**

```json
{
  "ok": true,
  "data": {
    "id": "clx...",
    "assignedTo": { "id": "usr...", "name": "Agent Smith" }
  }
}
```

Assignment also creates an `Activity` of type `ASSIGNMENT` (see activity log section).

---

### `POST /api/leads/:id/transition`

Change the lead's status/stage. See pipeline-module.md for transition validation.

**Request Body:**

```json
{
  "toStatus": "Qualified"
}
```

**Response `200`:**

```json
{
  "ok": true,
  "data": {
    "id": "clx...",
    "status": "Qualified",
    "previousStatus": "Contacted"
  }
}
```

Every transition writes an `Activity` row with `type = "STATUS_CHANGE"`.

---

### `GET /api/leads/:id/activity`

Get activity log for a lead.

**Query Parameters:** `page`, `pageSize` (default 20).

**Response `200`:**

```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "id": "act...",
        "type": "STATUS_CHANGE",
        "content": "Status changed from Contacted to Qualified",
        "metadata": { "fromStatus": "Contacted", "toStatus": "Qualified" },
        "user": { "id": "usr...", "name": "Agent Smith" },
        "createdAt": "2026-05-10T11:00:00Z"
      },
      {
        "id": "act...",
        "type": "NOTE",
        "content": "Customer called to confirm site visit",
        "user": { "id": "usr...", "name": "Agent Smith" },
        "createdAt": "2026-05-10T10:30:00Z"
      }
    ],
    "total": 5,
    "page": 1,
    "pageSize": 20
  }
}
```

---

### `POST /api/leads/check-duplicates`

Pre-create duplicate check (for UI to warn before form submission).

**Request Body:**

```json
{
  "phone": "+919876543210",
  "email": "john@example.com",
  "name": "John Doe",
  "city": "Mumbai"
}
```

All fields optional — send whatever the user has filled in.

**Response `200`:**

```json
{
  "ok": true,
  "data": {
    "hard": [
      {
        "id": "clx...",
        "name": "John Doe",
        "phone": "+919876543210",
        "email": "john@example.com",
        "status": "New",
        "assignedTo": { "id": "usr...", "name": "Agent Smith" }
      }
    ],
    "soft": [
      {
        "id": "cly...",
        "name": "John D.",
        "phone": "+919000000000",
        "email": null,
        "status": "Qualified",
        "assignedTo": { "id": "usr...", "name": "Agent Jane" }
      }
    ]
  }
}
```

---

### `POST /api/leads/import`

Bulk import leads from CSV. (Detailed spec in S4-BE-B-01.)

**Request:** Multipart form with CSV file. `Content-Type: multipart/form-data`.

**Response `200`:**

```json
{
  "ok": true,
  "data": {
    "imported": 45,
    "duplicates": 3,
    "errors": 2,
    "errorDetails": [
      { "row": 7, "field": "phone", "message": "Invalid phone format" }
    ]
  }
}
```

---

## Dedup Algorithm

### Hard match (blocks creation)

- **Phone:** Exact string match (after normalization — stripped of spaces, dashes, and `+` prefix normalized to E.164).
- **Email:** Case-insensitive exact match (`{ equals, mode: "insensitive" }`).

If `hard.length > 0` and `?force=true` is NOT present → `409 CONFLICT`.

### Soft match (warning only, never blocks)

- **Name + City:** Case-insensitive `contains` on name + `equals` on city, excluding any leads already in the hard match set.
- Returned only by `GET /api/leads/check-duplicates` and the import preview.
- Caps at 5 results to avoid heavy queries.

### Phone normalization

```
Input: "98765 43210" | "98765-43210" | "+91 9876543210"
Output: "+919876543210"
```

Normalization happens inside `lead.validation.js` zod schema before the service layer sees it. The dedup query matches against the already-normalized value.

---

## Assignment Rules

### MVP: Manual assignment only

- On create: `assignedToId` defaults to `req.user.id` (creator becomes owner).
- Explicit assignment via `POST /api/leads/:id/assign` available to MANAGER+ roles.
- AGENT can only assign leads to themselves.

### Deferred (post-MVP): Round-robin, source-based

- Round-robin: automatically distribute new leads among active agents.
- Source-based: route website leads to a specific team.
- These are NOT part of MVP. The design doc notes them as future enhancements.

### Permission matrix for assignment

| Role        | Assign to self | Assign to others | View all leads |
| ----------- | -------------- | ---------------- | -------------- |
| AGENT       | ✓              |                  |                |
| MANAGER     | ✓              | ✓                | ✓              |
| ADMIN       | ✓              | ✓                | ✓              |
| OWNER       | ✓              | ✓                | ✓              |

---

## Activity Log Integration

Every state-changing operation on a lead writes an `Activity` row:

| Operation              | Activity Type     | Content                             |
| ---------------------- | ----------------- | ----------------------------------- |
| Lead created           | `SYSTEM`          | "Lead created"                      |
| Status transition      | `STATUS_CHANGE`   | "Status changed from A to B"        |
| Assignment change      | `ASSIGNMENT`      | "Assigned to Agent Smith"           |
| Note added             | `NOTE`            | (user-provided content)             |
| Call logged            | `CALL`            | (user-provided content)             |
| Email sent             | `EMAIL`           | (user-provided content)             |
| WhatsApp sent          | `WHATSAPP`        | (user-provided content)             |

Activities are immutable (append-only). One lead can have many activities.

---

## Zod Schema (lead.validation.js)

```js
// Normalized phone regex: 10-15 digits after stripping non-numeric
const phoneSchema = z.string().transform(normalizePhone);

const createLeadSchema = z.object({
  name: z.string().min(1).max(200),
  phone: phoneSchema,
  email: z.string().email().optional().nullable(),
  source: z.string().max(50).optional().nullable(),
  requirementType: z.string().max(50).optional().nullable(),
  budget: z.number().positive().optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  interestedProjectId: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  assignedToId: z.string().optional().nullable(),
});

const updateLeadSchema = createLeadSchema.partial().omit({ status: true });

const listQuerySchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  assignedToId: z.string().optional(),
  source: z.string().optional(),
  interestedProjectId: z.string().optional(),
  tag: z.string().optional(),
  city: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["createdAt:desc","createdAt:asc","updatedAt:desc","name:asc"]).default("createdAt:desc"),
});

const assignSchema = z.object({
  assignedToId: z.string().min(1),
});

const transitionSchema = z.object({
  toStatus: z.string().min(1),
});

const checkDupSchema = z.object({
  phone: phoneSchema.optional(),
  email: z.string().email().optional(),
  name: z.string().optional(),
  city: z.string().optional(),
});
```
