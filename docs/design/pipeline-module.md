# Pipeline Module Design

## PipelineStage Model

Each company has its own set of pipeline stages (per-tenant). Stages are seeded on company registration and can be customized later (post-MVP).

```
PipelineStage {
  id          String   @id @default(cuid())
  companyId   String
  name        String                     // e.g. "New", "Contacted", "Qualified", etc.
  order       Int                        // Display order (0-based ascending)
  probability Int      @default(0)       // Win probability percentage (0-100)
  isWon       Boolean  @default(false)   // Terminal "won" stage flag
  isLost      Boolean  @default(false)   // Terminal "lost" stage flag
  isDefault   Boolean  @default(false)   // Stage comes from the system seed (vs. custom)
  createdAt   DateTime @default(now())

  company     Company  @relation(fields: [companyId], references: [id])

  @@unique([companyId, name])            // Stage names unique within a company
}
```

### Default seeded stages

On company registration, the system seeds these 9 stages:

| Order | Name                   | Probability | isWon | isLost |
| ----- | ---------------------- | ----------- | ----- | ------ |
| 0     | New                    | 10          |       |        |
| 1     | Contacted              | 20          |       |        |
| 2     | Qualified              | 35          |       |        |
| 3     | Site Visit Scheduled   | 50          |       |        |
| 4     | Site Visit Done        | 60          |       |        |
| 5     | Negotiation            | 75          |       |        |
| 6     | Booked                 | 90          |       |        |
| 7     | Closed Won             | 100         | ✓     |        |
| 8     | Closed Lost            | 0           |       | ✓      |

Stages 7 and 8 (`Closed Won`, `Closed Lost`) are terminal — no transitions out.

---

## Status Transition Validation

### Allowed transitions map

```
New                   → [Contacted]
Contacted             → [Qualified]
Qualified             → [Site Visit Scheduled, Contacted]  // Can go back if requalification needed
Site Visit Scheduled  → [Site Visit Done, Contacted]
Site Visit Done       → [Negotiation, Contacted]
Negotiation           → [Booked, Site Visit Done, Contacted]
Booked                → [Closed Won, Closed Lost, Negotiation]
Closed Won            → []  // Terminal — no transitions out
Closed Lost           → []  // Terminal — no transitions out
```

**Validation logic (MVP):**

```js
const ALLOWED_TRANSITIONS = {
  "New":                   ["Contacted"],
  "Contacted":             ["Qualified"],
  "Qualified":             ["Site Visit Scheduled", "Contacted"],
  "Site Visit Scheduled":  ["Site Visit Done", "Contacted"],
  "Site Visit Done":       ["Negotiation", "Contacted"],
  "Negotiation":           ["Booked", "Site Visit Done", "Contacted"],
  "Booked":                ["Closed Won", "Closed Lost", "Negotiation"],
  "Closed Won":            [],
  "Closed Lost":           [],
};
```

If the requested `toStatus` is not in `ALLOWED_TRANSITIONS[fromStatus]`, return:

```json
{
  "ok": false,
  "error": {
    "code": "INVALID_TRANSITION",
    "message": "Cannot transition from 'New' to 'Closed Won'",
    "details": {
      "fromStatus": "New",
      "toStatus": "Closed Won",
      "allowedTransitions": ["Contacted"]
    }
  }
}
```

**Non-MVP (future):** Stage entry/exit criteria — e.g., "must have a site visit date before marking Site Visit Done". This will be implemented as a validation hook that can be configured per stage.

---

## API Endpoints

### Base URL: `/api/pipeline`

All endpoints require authentication.

---

### `GET /api/pipeline/stages`

List all stages for the current company, ordered by `order` ASC.

**Response `200`:**

```json
{
  "ok": true,
  "data": [
    {
      "id": "stg...",
      "name": "New",
      "order": 0,
      "probability": 10,
      "isWon": false,
      "isLost": false,
      "isDefault": true
    },
    {
      "id": "stg...",
      "name": "Contacted",
      "order": 1,
      "probability": 20,
      "isWon": false,
      "isLost": false,
      "isDefault": true
    }
  ]
}
```

---

### `PATCH /api/pipeline/stages/reorder`

Reorder stages. **OWNER/ADMIN only.**

**Request Body:**

```json
{
  "stageIds": ["stg_1", "stg_2", "stg_3", "stg_4", "stg_5", "stg_6", "stg_7", "stg_8", "stg_9"]
}
```

Validates: array must contain all stage IDs (no missing, no extras). Each ID is assigned `order` matching its array index.

**Response `200`:**

```json
{
  "ok": true,
  "data": { "message": "Stages reordered" }
}
```

---

### `PATCH /api/pipeline/stages/:id`

Update a single stage's name or probability. **OWNER/ADMIN only.** Cannot toggle `isWon`/`isLost` (system flags).

**Request Body:**

```json
{
  "name": "Hot Lead",
  "probability": 40
}
```

Both fields optional. `name` must be unique within the company.

**Response `200`:**

```json
{
  "ok": true,
  "data": {
    "id": "stg...",
    "name": "Hot Lead",
    "order": 2,
    "probability": 40,
    "isWon": false,
    "isLost": false
  }
}
```

---

### `POST /api/pipeline/stages`

Create a custom stage (post-MVP stretch goal — not in MVP). Document for now:

```js
// TODO: Post-MVP — add body validation for name uniqueness
// POST /api/pipeline/stages
// Body: { name, probability?, insertAfterStageId? }
```

---

### `DELETE /api/pipeline/stages/:id`

Delete a custom stage (post-MVP stretch goal — not in MVP). Cannot delete default stages. Leads in the deleted stage must be reassigned.

---

## Kanban Payload Shape

### `GET /api/pipeline/kanban`

Fetch all stages with their leads grouped by stage. This is the primary data source for the Kanban board UI.

**Query Parameters:**

| Param    | Type   | Description                           |
| -------- | ------ | ------------------------------------- |
| `search` | string | Filter leads by name/email/phone      |
| `assignedToId` | string | Filter leads by assignee     |
| `source` | string | Filter by source                      |
| `tag`    | string | Filter by tag                         |

**Response `200`:**

```json
{
  "ok": true,
  "data": {
    "stages": [
      {
        "id": "stg...",
        "name": "New",
        "order": 0,
        "probability": 10,
        "leads": [
          {
            "id": "clx...",
            "name": "John Doe",
            "phone": "+919876543210",
            "email": "john@example.com",
            "source": "website",
            "city": "Mumbai",
            "budget": 7500000,
            "tags": ["hot"],
            "score": 65,
            "assignedTo": { "id": "usr...", "name": "Agent Smith" },
            "interestedProject": { "id": "prj...", "name": "Acme Heights" },
            "lastContactedAt": "2026-05-09T14:00:00Z",
            "createdAt": "2026-05-08T10:00:00Z"
          }
        ],
        "leadCount": 12
      }
    ],
    "stageOrder": ["stg_new", "stg_contacted", ...],
    "totalLeads": 42
  }
}
```

**Notes:**
- `stages[].leads` contains a summary view of each lead (not the full detail).
- Clicking a lead card navigates to the lead detail page (`GET /api/leads/:id`).
- The `stageOrder` array at the top level provides the sort order (useful after reorder).
- The AGENT role scoping applies here too — AGENTs only see their own leads within each stage.

---

## Activity Log Integration

### Auto-logging on transition

Every `POST /api/leads/:id/transition` call MUST also create an Activity record. This is handled in the lead transition service, not in the controller.

**Activity row created:**

```json
{
  "id": "act_xxx",
  "companyId": "co_xxx",
  "leadId": "clx_xxx",
  "userId": "usr_xxx",
  "type": "STATUS_CHANGE",
  "content": "Status changed from 'Contacted' to 'Qualified'",
  "metadata": {
    "fromStatus": "Contacted",
    "toStatus": "Qualified"
  },
  "createdAt": "2026-05-10T11:00:00Z"
}
```

### Other auto-logging events

| Trigger              | Activity Type   | Content                                     |
| -------------------- | --------------- | ------------------------------------------- |
| Lead created         | `SYSTEM`        | "Lead created"                              |
| Assignment changed   | `ASSIGNMENT`    | "Assigned to Agent Smith"                   |

### Activity model

```
Activity {
  id          String       @id @default(cuid())
  companyId   String
  leadId      String
  userId      String?
  type        ActivityType // enum: CALL, EMAIL, WHATSAPP, NOTE, STATUS_CHANGE, ASSIGNMENT, SYSTEM
  content     String
  metadata    Json?        // Flexible payload — transition details, call duration, etc.
  createdAt   DateTime     @default(now())

  lead        Lead         @relation(fields: [leadId], references: [id])
  user        User?        @relation(fields: [userId], references: [id])
}
```

Activity rows are immutable — never updated or deleted. The activity log for a lead is fetched via `GET /api/leads/:id/activity` (see lead-module.md).

---

## Transition Service Flow

```
POST /api/leads/:id/transition
  │
  ├─ 1. Validate body (zod): { toStatus }
  ├─ 2. Fetch lead + verify it exists (404 if not)
  ├─ 3. Fetch PipelineStage for toStatus (422 if stage doesn't exist for company)
  ├─ 4. Validate transition: is toStatus in ALLOWED_TRANSITIONS[currentStatus]?
  │      └─ If invalid → 400 INVALID_TRANSITION
  ├─ 5. BEGIN transaction (Prisma $transaction)
  │   ├─ Update lead.status = toStatus
  │   └─ Create Activity { type: "STATUS_CHANGE", content, metadata: { fromStatus, toStatus } }
  └─ 6. Commit → return updated lead
```

---

## PipelineModule Constants

```js
// backend/src/modules/pipeline/pipeline.constants.js

const DEFAULT_STAGES = [
  { name: "New",                   order: 0, probability: 10, isWon: false, isLost: false },
  { name: "Contacted",             order: 1, probability: 20, isWon: false, isLost: false },
  { name: "Qualified",             order: 2, probability: 35, isWon: false, isLost: false },
  { name: "Site Visit Scheduled",  order: 3, probability: 50, isWon: false, isLost: false },
  { name: "Site Visit Done",       order: 4, probability: 60, isWon: false, isLost: false },
  { name: "Negotiation",           order: 5, probability: 75, isWon: false, isLost: false },
  { name: "Booked",                order: 6, probability: 90, isWon: false, isLost: false },
  { name: "Closed Won",            order: 7, probability: 100, isWon: true,  isLost: false },
  { name: "Closed Lost",           order: 8, probability: 0,   isWon: false, isLost: true  },
];

const ALLOWED_TRANSITIONS = {
  "New":                   ["Contacted"],
  "Contacted":             ["Qualified"],
  "Qualified":             ["Site Visit Scheduled", "Contacted"],
  "Site Visit Scheduled":  ["Site Visit Done", "Contacted"],
  "Site Visit Done":       ["Negotiation", "Contacted"],
  "Negotiation":           ["Booked", "Site Visit Done", "Contacted"],
  "Booked":                ["Closed Won", "Closed Lost", "Negotiation"],
  "Closed Won":            [],
  "Closed Lost":           [],
};

module.exports = { DEFAULT_STAGES, ALLOWED_TRANSITIONS };
```
