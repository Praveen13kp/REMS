// ALL feature services MUST use getTenantPrisma(req.user.companyId) instead of
// importing prisma directly. PRs that bypass this will be rejected — it is the
// only thing keeping tenants isolated.

const prisma = require("../config/prisma");
const { ApiError } = require("./ApiError");

const tenantModels = [
  "User",
  "Lead",
  "Project",
  "Task",
  "Activity",
  "Note",
  "PipelineStage",
  "Notification",
];

// findUnique / findUniqueOrThrow require a where built from a single unique
// field; injecting companyId would make Prisma reject the query. Services must
// use findFirst / findFirstOrThrow when they need tenant scoping.
const readOps = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
]);

const writeWhereOps = new Set([
  "updateMany",
  "deleteMany",
]);

const createOps = new Set([
  "create",
  "createMany",
  "createManyAndReturn",
]);

function getTenantPrisma(companyId) {
  if (!companyId) {
    throw new ApiError(500, "tenantPrisma called without companyId");
  }

  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!tenantModels.includes(model)) return query(args);

          if (readOps.has(operation) || writeWhereOps.has(operation)) {
            args = { ...args, where: { ...(args.where || {}), companyId } };
          } else if (createOps.has(operation)) {
            if (Array.isArray(args.data)) {
              args = { ...args, data: args.data.map((d) => ({ ...d, companyId })) };
            } else {
              args = { ...args, data: { ...args.data, companyId } };
            }
          }
          // findUnique/update/delete/upsert intentionally pass through —
          // callers must scope manually or switch to *Many variants.

          return query(args);
        },
      },
    },
  });
}

module.exports = { getTenantPrisma };
