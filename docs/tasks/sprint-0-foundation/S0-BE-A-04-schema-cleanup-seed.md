# S0-BE-A-04 — Schema cleanup pass + seed script

**Owner:** BE-A
**Branch:** `be/db/S0-BE-A-04-schema-seed`
**Estimated:** 0.5 day
**Blocks:** S1-BE-A-01, S1-BE-B-01, S2-BE-B-01
**Blocked by:** S0-BE-A-02 (better-auth schema additions land first)

## Goal

Tidy the Prisma schema for upcoming sprints (we don't need every field yet, but we need the right shape) and add a seed script that creates one demo company + one owner + one agent + a couple of projects + a few leads, so other interns have data to work against.

## Files to read first

- `backend/prisma/schema.prisma` (current)
- `backend/prisma/migrations/`
- The SOW sections 7.1, 7.2, 7.4, 7.5

## Steps

### 1. Schema additions (additive — don't break existing migrations)

Add the following models / enum updates. Most fields are nullable to keep the MVP slice flexible.

**`Company`** — add: `logoUrl String?`, `brandColor String?`, `timezone String? @default("Asia/Kolkata")`, `currency String? @default("INR")`, `subscriptionPlan String? @default("FREE_TRIAL")`, `onboardingCompleted Boolean @default(false)`.

**`User`** — add: `phone String?`, `isActive Boolean @default(true)`, `invitedById String?`, `invitedBy User? @relation("UserInvites", fields: [invitedById], references: [id])`, `invitees User[] @relation("UserInvites")`.

**`Role` enum** — add `OWNER` (above SUPER_ADMIN). Make `OWNER` the default for the first user of a new company.

**`Project`** — add: `description String?`, `reraNumber String?`, `possessionDate DateTime?`, `coverImageUrl String?`.

**`Lead`** — add: `requirementType String?` (e.g. "1BHK", "2BHK"), `city String?`, `interestedProjectId String?`, `interestedProject Project? @relation(fields: [interestedProjectId], references: [id])`, `score Int?`, `tags String[]`, `lastContactedAt DateTime?`.

**New: `PipelineStage`** model — `id, companyId, name, order Int, probability Int, isWon Boolean, isLost Boolean, isDefault Boolean, createdAt`. Each company gets its own stages (seeded on registration).

**New: `Activity`** model — `id, companyId, leadId, userId, type ActivityType, content String, metadata Json?, createdAt`. Enum `ActivityType { CALL, EMAIL, WHATSAPP, NOTE, STATUS_CHANGE, ASSIGNMENT, SYSTEM }`.

**New: `Note`** model — `id, companyId, leadId, userId, content String, createdAt, updatedAt`. (Notes are a richer form of activity for free-text remarks; keep activity-log immutable.)

**`Task`** — add: `dueAt DateTime?`, `leadId String?`, `lead Lead? @relation(fields: [leadId], references: [id])`. Replace `companyId` direct relation if needed.

### 2. Migration

Run `npx prisma migrate dev --name s0_schema_cleanup`. Verify the generated SQL doesn't drop existing data.

### 3. Seed script — `backend/prisma/seed.js`

Idempotent: should be safe to re-run (use `upsert`). Creates:

- 1 demo `Company` named "Acme Realty" (`id: "demo-co-1"`)
- 4 users: 1 OWNER, 1 MANAGER, 2 AGENTs — passwords via better-auth's password hash util (or call better-auth's signup API directly inside the seed)
- Default 9 pipeline stages: New, Contacted, Qualified, Site Visit Scheduled, Site Visit Done, Negotiation, Booked, Closed Won, Closed Lost
- 2 projects: "Acme Heights" and "Acme Greens"
- 5 leads in varied stages assigned to the agents

### 4. package.json scripts

Add to `backend/package.json`:

```json
"scripts": {
  "dev": "nodemon server.js",
  "db:migrate": "prisma migrate dev",
  "db:seed": "node prisma/seed.js",
  "db:reset": "prisma migrate reset --force && npm run db:seed"
}
```

Document in `backend/README.md` (create if missing) how to reset the DB.

## Acceptance criteria

- [ ] All model additions present in `schema.prisma`
- [ ] Migration generated and applied cleanly
- [ ] `npm run db:seed` populates demo data without errors
- [ ] Re-running `npm run db:seed` does not duplicate records (idempotent)
- [ ] Demo owner can log in via `POST /api/auth/sign-in/email` after seed
- [ ] `backend/README.md` documents the db scripts

## AI prompt template

> I'm on task S0-BE-A-04. Read this task spec, the current `backend/prisma/schema.prisma`, and the `backend/AUTH.md` from S0-BE-A-02. Propose the full schema diff first (as a unified diff against the current schema). Wait for my approval. Then write the seed script using better-auth's signup API to create users so password hashes are correct.

## Notes for reviewer

- Watch for `String[]` (tags on Lead) — Postgres-only; fine here since DB is Postgres
- Confirm `interestedProjectId` is nullable so leads without a chosen project still work
- Seed script must be runnable on a fresh DB AND on a populated one
