const prisma = require("../../config/prisma");
const { ApiError } = require("../../lib/ApiError");

async function getDepartments(companyId) {
  return prisma.department.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
  });
}

async function createDepartment(companyId, name) {
  const trimmed = name.trim();
  if (!trimmed) throw new ApiError(400, "Department name is required");

  const existing = await prisma.department.findUnique({
    where: { companyId_name: { companyId, name: trimmed } },
  });
  if (existing) throw new ApiError(409, "Department already exists");

  return prisma.department.create({
    data: { name: trimmed, companyId },
  });
}

async function updateDepartment(companyId, departmentId, name) {
  const trimmed = name.trim();
  if (!trimmed) throw new ApiError(400, "Department name is required");

  const dept = await prisma.department.findFirst({
    where: { id: departmentId, companyId },
  });
  if (!dept) throw new ApiError(404, "Department not found");

  const duplicate = await prisma.department.findFirst({
    where: { companyId, name: trimmed, id: { not: departmentId } },
  });
  if (duplicate) throw new ApiError(409, "Department name already exists");

  return prisma.department.update({
    where: { id: departmentId },
    data: { name: trimmed },
  });
}

async function deleteDepartment(companyId, departmentId) {
  const dept = await prisma.department.findFirst({
    where: { id: departmentId, companyId },
  });
  if (!dept) throw new ApiError(404, "Department not found");

  await prisma.department.delete({ where: { id: departmentId } });
  return { ok: true };
}

async function setUserDepartments(companyId, userId, departmentIds) {
  const user = await prisma.user.findFirst({
    where: { id: userId, companyId },
    select: { id: true, role: true },
  });
  if (!user) throw new ApiError(404, "User not found");

  // Validate all departments exist and belong to this company
  if (departmentIds && departmentIds.length > 0) {
    const depts = await prisma.department.findMany({
      where: { id: { in: departmentIds }, companyId },
      select: { id: true },
    });
    if (depts.length !== departmentIds.length) {
      throw new ApiError(400, "One or more departments not found");
    }
  }

  // Replace all department associations
  await prisma.$transaction([
    prisma.userDepartment.deleteMany({ where: { userId } }),
    ...(departmentIds || []).map((deptId) =>
      prisma.userDepartment.create({ data: { userId, departmentId: deptId } }),
    ),
  ]);

  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      departments: {
        select: { department: { select: { id: true, name: true } } },
      },
    },
  });
}

async function getUserDepartments(userId) {
  const uds = await prisma.userDepartment.findMany({
    where: { userId },
    select: { department: { select: { id: true, name: true } } },
  });
  return uds.map((ud) => ud.department);
}

module.exports = {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  setUserDepartments,
  getUserDepartments,
};
