# S0-BE-A-03 — Tenant Prisma helper, env validation, logger, error envelope

**Owner:** BE-A
**Branch:** `be/foundation/S0-BE-A-03-platform`
**Estimated:** 1 day
**Blocks:** every feature module (lead, project, etc.)
**Blocked by:** S0-BE-A-01

## Goal

Build the platform primitives that every feature will use: a tenant-scoped Prisma client, env validation on boot, a structured logger, and a standard error type + global error middleware.

## Files to read first

- `backend/src/config/prisma.js`
- `backend/src/middleware/errorMiddleware.js`
- `backend/.env`
- `docs/CONTRIBUTING.md` § 2 Backend conventions

## Steps

### 1. Env validation — `backend/src/lib/env.js`

```js
// Pseudo-spec — implement with zod
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),
});
module.exports = { env: schema.parse(process.env) };
```

- On parse failure, log a clear error and `process.exit(1)`.
- Update `backend/.env.example` (create it) listing every required key with placeholder values.
- Replace all `process.env.X` reads in the codebase with `env.X` imports.

### 2. Logger — `backend/src/lib/logger.js`

- Use `pino` (add as dep: `npm i pino pino-pretty`).
- In dev, pretty-print; in prod, JSON.
- Export `logger` and a request-id-aware child via a middleware factory.
- Replace `morgan` with `pino-http` in `app.js`.

### 3. Tenant-scoped Prisma — `backend/src/lib/tenantPrisma.js`

```js
// Pseudo-spec
const prisma = require("../config/prisma");

function getTenantPrisma(companyId) {
  if (!companyId) throw new ApiError(500, "tenantPrisma called without companyId");
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // List of models that have a companyId field
          const tenantModels = ["User", "Lead", "Project", "Task", "Activity", "Note", "PipelineStage"];
          if (!tenantModels.includes(model)) return query(args);

          // For reads: inject companyId into where
          if (["findFirst", "findMany", "findUnique", "count", "aggregate"].includes(operation)) {
            args.where = { ...(args.where || {}), companyId };
          }
          // For writes: inject companyId into data
          if (["create", "createMany"].includes(operation)) {
            if (Array.isArray(args.data)) args.data = args.data.map(d => ({ ...d, companyId }));
            else args.data = { ...args.data, companyId };
          }
          // For updates/deletes: inject into where
          if (["update", "updateMany", "delete", "deleteMany", "upsert"].includes(operation)) {
            args.where = { ...(args.where || {}), companyId };
          }
          return query(args);
        },
      },
    },
  });
}

module.exports = { getTenantPrisma };
```

- Document this file with a comment block at the top: "ALL feature services must use `getTenantPrisma(req.user.companyId)` instead of importing `prisma` directly. PRs that bypass this will be rejected."

### 4. ApiError + error middleware — `backend/src/lib/ApiError.js` and `backend/src/middleware/errorMiddleware.js`

- `ApiError(statusCode, message, details?)` extending `Error`.
- Error middleware formats response as: `{ ok: false, error: { code, message, details? } }` and logs via `logger`.
- Successful response convention (document in `docs/CONTRIBUTING.md`): `{ ok: true, data: ... }`. Update CONTRIBUTING after this PR.

### 5. Tenant context middleware — `backend/src/middleware/tenantMiddleware.js`

- Runs after `authMiddleware`.
- Reads `req.user.companyId`, attaches `req.tenantPrisma = getTenantPrisma(req.user.companyId)`.
- Use this on all authenticated routes. Document in the auth module.

## Acceptance criteria

- [ ] Server fails fast with a clear error if env vars are missing
- [ ] `backend/.env.example` checked in
- [ ] `pino` logs replace `morgan`; structured JSON in prod, pretty in dev
- [ ] `getTenantPrisma(companyId)` injects `companyId` into all reads/writes/updates/deletes for tenant-scoped models
- [ ] `ApiError` + global error middleware produce `{ ok: false, error }` envelope
- [ ] `tenantMiddleware` exposes `req.tenantPrisma`
- [ ] `docs/CONTRIBUTING.md` updated with response envelope convention (open a small follow-up PR if needed)
- [ ] Server starts cleanly

## AI prompt template

> I'm on task S0-BE-A-03. Read this task spec, `backend/src/config/prisma.js`, the existing `errorMiddleware.js`, and `docs/CONTRIBUTING.md`. Implement four files: `lib/env.js`, `lib/logger.js`, `lib/tenantPrisma.js`, `lib/ApiError.js`, and a new `middleware/tenantMiddleware.js`. Use `zod` for env validation, `pino` + `pino-http` for logging, and Prisma's `$extends` API for tenant scoping. Write the files one at a time and pause between each so I can review.

## Notes for reviewer

- The Prisma `$extends` query interceptor is the load-bearing piece — verify it handles every operation type
- Watch for cases where a non-tenant model (like `Company` itself) is queried; those should pass through unchanged
- `tenantPrisma` should NOT be cached per-request (Prisma extensions are cheap); but DO cache the base `PrismaClient` (singleton)
