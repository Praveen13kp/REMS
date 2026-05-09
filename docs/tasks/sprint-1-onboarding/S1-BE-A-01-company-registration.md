# S1-BE-A-01 — Company self-registration

**Owner:** BE-A
**Branch:** `be/company/S1-BE-A-01-registration`
**Estimated:** 1 day
**Blocks:** S1-FE-A-01 (registration UI), S1-BE-A-02 (user invite)
**Blocked by:** S0-BE-A-02, S0-BE-A-03, S0-BE-A-04

## Goal

When someone signs up, they're not just creating a user — they're creating a **company** (tenant) and becoming its OWNER. The default pipeline stages are seeded for that company. The user is logged in and routed to the onboarding wizard.

## Files to read first

- `backend/src/lib/auth.js`
- `backend/src/modules/auth/auth.*`
- `backend/prisma/seed.js` (for the default pipeline stages)
- `backend/prisma/schema.prisma`

## Steps

### 1. Endpoint — `POST /api/company/register`

Request body (zod-validated):
```js
{
  companyName: string,    // min 2
  companyType: enum["DEVELOPER","BROKERAGE","CHANNEL_PARTNER","INDIVIDUAL"],
  city: string,
  ownerName: string,
  ownerEmail: string,
  ownerPhone: string,
  password: string,       // min 8, must include letter + number
}
```

### 2. Service — `backend/src/modules/company/company.service.js`

```js
async function registerCompanyAndOwner(input) {
  // Wrap in prisma.$transaction
  // 1. Create Company (id auto, name, ...)
  // 2. Use better-auth's signUp.email() to create the User with hashed password
  //    — set companyId in additional fields (configure better-auth additionalFields if needed)
  // 3. Update User.role = OWNER, User.companyId = company.id
  // 4. Seed default 9 PipelineStages for this company
  // 5. Return { company, user, sessionToken }
}
```

Add the `companyType` enum to schema if not present (BE-A owns schema — add it here in the same migration).

### 3. Routes — `backend/src/modules/company/company.routes.js`

- `POST /register` — public, runs `registerCompanyAndOwner`. Sets the better-auth session cookie before responding.
- `GET /me` — authenticated, returns current user's company with `onboardingCompleted` + counts (users, projects, leads).
- `PATCH /me` — authenticated, OWNER/ADMIN only. Allows updating `name`, `logoUrl`, `brandColor`, `timezone`, `currency`, `onboardingCompleted`.

Mount in `backend/src/routes/index.js` as `/api/company`.

### 4. Default pipeline stages

Centralize in `backend/src/modules/pipeline/pipeline.constants.js`:

```js
const DEFAULT_STAGES = [
  { name: "New", order: 1, probability: 5, isWon: false, isLost: false, isDefault: true },
  { name: "Contacted", order: 2, probability: 10, ... },
  // ... 7 more
];
```

The seed script and the registration service both import this constant (single source of truth).

### 5. Validation — `company.validation.js`

zod schema for the registration body. Reject duplicate company emails AND duplicate user emails with a 409.

### 6. Tests (manual)

curl example added to `backend/AUTH.md`:

```
curl -X POST http://localhost:4000/api/company/register \
  -H "Content-Type: application/json" \
  -d '{"companyName":"Test Co","companyType":"BROKERAGE","city":"Pune","ownerName":"Tee","ownerEmail":"t@x.com","ownerPhone":"9999999999","password":"Passw0rd!"}'
```

## Acceptance criteria

- [ ] `POST /api/company/register` creates Company + User(OWNER) + 9 PipelineStages atomically
- [ ] Duplicate email returns 409
- [ ] Session cookie set on success
- [ ] `GET /api/company/me` returns the current company + counts
- [ ] `PATCH /api/company/me` enforces OWNER/ADMIN
- [ ] Failed registration leaves no orphan rows (transaction rolls back)
- [ ] curl examples in `backend/AUTH.md`

## AI prompt template

> I'm on task S1-BE-A-01. Read this spec, `backend/src/lib/auth.js`, `backend/src/modules/auth/`, `backend/prisma/schema.prisma`, and `backend/prisma/seed.js`. Build the company module under `backend/src/modules/company/` with routes/controller/service/validation. The tricky part is creating the User with a hashed password while also setting `companyId` and `role: OWNER` — figure out whether to call better-auth's API and then update the user, or to use better-auth's `additionalFields` config. Show me your plan first.

## Notes for reviewer

- Transaction integrity is critical — registering must be atomic
- Verify session cookie has `SameSite=Lax` (or `None; Secure` if cross-origin)
- The `DEFAULT_STAGES` constant is shared — make sure both seed and registration use it
