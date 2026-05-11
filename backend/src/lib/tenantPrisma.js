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
];

function getTenantPrisma(companyId) {
  if (!companyId) {
    throw new ApiError(500, "tenantPrisma called without companyId");
  }

  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!tenantModels.includes(model)) return query(args);

          if (["findFirst", "findMany", "findUnique", "count", "aggregate"].includes(operation)) {
            args.where = { ...(args.where || {}), companyId };
          }

          if (["create", "createMany"].includes(operation)) {
            if (Array.isArray(args.data)) {
              args.data = args.data.map((d) => ({ ...d, companyId }));
            } else {
              args.data = { ...args.data, companyId };
            }
          }

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
