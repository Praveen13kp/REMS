const prisma = require("../../config/prisma");
const { ApiError } = require("../../lib/ApiError");

const TEMPLATE_INCLUDE = {
  createdBy: { select: { id: true, name: true, email: true } },
};

// Variable expansion for {{lead.name}}, {{user.name}}, {{company.name}}
// etc. Unknown keys render as empty string — matches what most ESPs do
// and keeps an unset field from spilling its placeholder into the email.
function renderTemplate(content, context = {}) {
  if (!content) return "";
  return content.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => {
    const value = path.split(".").reduce((acc, key) => acc?.[key], context);
    return value == null ? "" : String(value);
  });
}

async function listTemplates(companyId) {
  return prisma.emailTemplate.findMany({
    where: { companyId },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    include: TEMPLATE_INCLUDE,
  });
}

async function getTemplate(companyId, id) {
  const row = await prisma.emailTemplate.findFirst({
    where: { id, companyId },
    include: TEMPLATE_INCLUDE,
  });
  if (!row) throw new ApiError(404, "Template not found");
  return row;
}

async function createTemplate(companyId, userId, { name, subject, body, category }) {
  if (!name?.trim()) throw new ApiError(400, "Name is required");
  if (!subject?.trim()) throw new ApiError(400, "Subject is required");
  if (!body?.trim()) throw new ApiError(400, "Body is required");
  return prisma.emailTemplate.create({
    data: {
      companyId,
      createdById: userId,
      name: name.trim(),
      subject: subject.trim(),
      body,
      category: category?.trim() || null,
    },
    include: TEMPLATE_INCLUDE,
  });
}

async function updateTemplate(companyId, id, { name, subject, body, category }) {
  await getTemplate(companyId, id); // 404 guard
  return prisma.emailTemplate.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(subject !== undefined && { subject: subject.trim() }),
      ...(body !== undefined && { body }),
      ...(category !== undefined && { category: category?.trim() || null }),
    },
    include: TEMPLATE_INCLUDE,
  });
}

async function deleteTemplate(companyId, id) {
  await getTemplate(companyId, id);
  await prisma.emailTemplate.delete({ where: { id } });
}

module.exports = {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  renderTemplate,
};
