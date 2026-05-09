# S0-BE-A-02 — Switch auth to better-auth

**Owner:** BE-A
**Branch:** `be/auth/S0-BE-A-02-better-auth`
**Estimated:** 1 day
**Blocks:** S1-BE-A-01 (company self-registration), all features that need a logged-in user
**Blocked by:** S0-BE-A-01

## Goal

The current auth code stores plaintext passwords and only checks `findUnique` by email. Replace it with `better-auth` (already in `package.json`), which gives us hashed passwords, sessions, email verification stub, and password reset.

## Files to read first

- `backend/package.json` — confirm `better-auth` version
- `backend/src/modules/auth/*`
- `backend/src/middleware/authMiddleware.js`
- `backend/prisma/schema.prisma`
- [better-auth docs](https://www.better-auth.com/docs) — installation, Prisma adapter, email/password plugin
- `docs/CONTRIBUTING.md`

## Steps

1. **Schema changes** — better-auth needs its own `Session`, `Account`, `Verification` tables. Open a coordination ticket (Slack post) describing the schema additions; since BE-A owns the schema, you can make them yourself in this PR. Add the better-auth-required models to `prisma/schema.prisma` per better-auth's Prisma adapter docs. Run `npx prisma migrate dev --name add_better_auth`.
2. **Better-auth instance** — create `backend/src/lib/auth.js` exporting a configured `betterAuth({...})` instance with:
   - Prisma adapter pointing to `prisma` from `src/config/prisma.js`
   - Email/password enabled (require email verification: false for now — we'll flip to true in S1)
   - Session cookie config (secure: false in dev, httpOnly: true)
   - Trusted origin: `http://localhost:5173`
3. **Mount handler** — in `backend/src/app.js`, mount the better-auth handler at `/api/auth/*`. Per docs, this is usually `app.all("/api/auth/*", toNodeHandler(auth))`.
4. **Delete the old auth implementation** — remove signup/login functions from `src/modules/auth/auth.service.js` and `auth.controller.js`. Keep the folder; we'll add helpers there for higher-level flows in S1 (e.g., `registerCompanyAndOwner`).
5. **Auth middleware** — rewrite `backend/src/middleware/authMiddleware.js` to use `auth.api.getSession({ headers: fromNodeHeaders(req.headers) })`. On valid session, attach `req.user = session.user` and `req.session = session.session`. On invalid, respond 401.
6. **Test manually with curl/Postman:**
   - `POST /api/auth/sign-up/email` with `{name, email, password}` → returns 200 + sets cookie
   - `POST /api/auth/sign-in/email` with `{email, password}` → returns 200 + sets cookie
   - `GET /api/auth/get-session` with cookie → returns user object
7. **Update README or add `backend/AUTH.md`** with the curl examples so other interns know how to test.

## Acceptance criteria

- [ ] `better-auth` is the only auth system; old plaintext signup/login removed
- [ ] Schema includes better-auth tables; migration committed
- [ ] `backend/src/lib/auth.js` exports configured auth instance
- [ ] `/api/auth/*` is handled by better-auth
- [ ] `authMiddleware` uses better-auth `getSession`
- [ ] `backend/AUTH.md` contains working curl examples
- [ ] No `bcrypt` / `jsonwebtoken` imports anywhere (better-auth handles both)

## AI prompt template

> I'm on task S0-BE-A-02. Read `docs/tasks/sprint-0-foundation/S0-BE-A-02-better-auth.md`, the current auth code under `backend/src/modules/auth/`, and `backend/src/middleware/authMiddleware.js`. Then fetch the better-auth docs (https://www.better-auth.com/docs/installation and the Prisma adapter page). Lay out the schema additions and the file-by-file changes before writing any code. Confirm with me before running `prisma migrate dev`.

## Notes for reviewer

- Most-likely failure mode: forgetting to add `trustedOrigins` → frontend cookies fail silently
- Verify the migration name is descriptive
- Check that `auth.js` is NOT importing `process.env` directly — secrets go through the env-validation module from S0-BE-A-03 (if that task lands first; otherwise hardcode and a follow-up will fix it)
