const { ApiError } = require("../../lib/ApiError");

const createLeadService = async (tenantPrisma, data) => {
  return tenantPrisma.lead.create({ data });
};

const getAllLeadsService = async (tenantPrisma) => {
  return tenantPrisma.lead.findMany({ orderBy: { createdAt: "desc" } });
};

const getLeadByIdService = async (tenantPrisma, id) => {
  const lead = await tenantPrisma.lead.findFirst({ where: { id } });
  if (!lead) throw new ApiError(404, "Lead not found");
  return lead;
};

// Use updateMany/deleteMany so the tenantPrisma extension can safely add
// companyId to the where clause (update/delete require a unique-only where).
const updateLeadService = async (tenantPrisma, id, data) => {
  const result = await tenantPrisma.lead.updateMany({ where: { id }, data });
  if (result.count === 0) throw new ApiError(404, "Lead not found");
  return getLeadByIdService(tenantPrisma, id);
};

const deleteLeadService = async (tenantPrisma, id) => {
  const result = await tenantPrisma.lead.deleteMany({ where: { id } });
  if (result.count === 0) throw new ApiError(404, "Lead not found");
};

module.exports = {
  createLeadService,
  getAllLeadsService,
  getLeadByIdService,
  updateLeadService,
  deleteLeadService,
};
