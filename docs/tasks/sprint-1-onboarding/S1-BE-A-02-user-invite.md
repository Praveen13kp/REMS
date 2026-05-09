# S1-BE-A-02 — User invite & team management

**Owner:** BE-A
**Branch:** `be/user/S1-BE-A-02-invite`
**Estimated:** 1 day
**Blocks:** S2-FE-B-03 (Team page UI), S1-FE-A-02 (onboarding step 2)
**Blocked by:** S1-BE-A-01

## Goal

The OWNER (or ADMIN) of a company can invite teammates by email. The invitee gets a one-time link to set their password and join the company.

## Files to read first

- `backend/src/modules/company/company.service.js`
- `backend/src/lib/auth.js`
- better-auth's "magic link" or invite plugin docs (skim)

## Steps

### 1. New model: `Invite`

Add to schema:
```
model Invite {
  id         String   @id @default(cuid())
  email      String
  role       Role
  companyId  String
  company    Company  @relation(fields: [companyId], references: [id])
  invitedById String
  invitedBy  User     @relation("InvitesSent", fields: [invitedById], references: [id])
  token      String   @unique
  expiresAt  DateTime
  acceptedAt DateTime?
  createdAt  DateTime @default(now())
  @@index([companyId])
  @@index([email])
}
```

(Update User model with the inverse relation `invitesSent Invite[] @relation("InvitesSent")`.)

### 2. Module — `backend/src/modules/user/`

Files:
- `user.routes.js` — mount under `/api/users`
- `user.controller.js`
- `user.service.js`
- `user.validation.js`

### 3. Endpoints

- `POST /api/users/invite` — OWNER/ADMIN only. Body: `{email, role, name?}`. Creates Invite row with random token (use `crypto.randomBytes(32).toString("hex")`), 7-day expiry. **For MVP, do NOT actually send email yet** — just return the invite link in the response (`http://localhost:5173/accept-invite?token=...`). Log a TODO comment to wire SendGrid/SMTP in a later sprint.
- `GET /api/users/invite/:token` — public. Returns `{email, role, companyName}` if the token is valid+unexpired+unused; 404/410 otherwise. Used by the FE accept-invite page to show the form.
- `POST /api/users/invite/:token/accept` — public. Body: `{name, password}`. Creates the User via better-auth signup, attaches to company, marks invite accepted, signs them in.
- `GET /api/users` — authenticated, OWNER/ADMIN/MANAGER. Lists users in the current company with their roles + last login. Pagination (`?page=1&pageSize=20`).
- `PATCH /api/users/:id` — OWNER/ADMIN only. Body: `{role?, isActive?, name?}`. Cannot change own role. Cannot demote/disable the only OWNER.
- `GET /api/users/me` — authenticated, returns current user.

### 4. RBAC middleware update

In `backend/src/middleware/rbacMiddleware.js`, expose a clean `requireRole(...allowedRoles)` factory used by routes:

```js
router.post("/invite", requireAuth, requireRole("OWNER","ADMIN"), controller.invite);
```

If `requireRole` doesn't exist yet, add it here (this is the first task that needs it for real).

### 5. Validation rules

- `role` cannot be `OWNER` on invite (must be promoted manually after acceptance, by an existing OWNER)
- Email must be unique among existing users in the company AND among non-expired pending invites
- Cannot invite yourself

## Acceptance criteria

- [ ] Migration adds `Invite` model
- [ ] All 6 endpoints exist with correct auth + role guards
- [ ] Accepting an invite creates a User in the right company with the right role
- [ ] Demoting the last OWNER returns 400 with a clear message
- [ ] Pending-invite list visible via `GET /api/users` with a flag (`status: "PENDING" | "ACTIVE"`)
- [ ] curl examples added to `backend/AUTH.md`

## AI prompt template

> I'm on task S1-BE-A-02. Read this task spec, `backend/src/modules/company/`, `backend/src/lib/auth.js`, and `backend/src/middleware/rbacMiddleware.js`. Build the user module + the Invite model. Don't actually send emails yet — the invite link comes back in the response. Walk me through the schema diff and the endpoint list before writing code.

## Notes for reviewer

- "Cannot demote the last OWNER" must be a hard server-side check, not just UI
- Invite tokens must be unguessable — `randomBytes(32).hex` is fine
- Pending invites should be visible to the team but not double-create users
