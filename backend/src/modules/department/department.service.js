const prisma = require("../../config/prisma");
const { ApiError } = require("../../lib/ApiError");

const SORTABLE_FIELDS = new Set(["name", "maxEmployees", "createdAt"]);

function parseSort(sort) {
  const [rawField, rawDir] = String(sort || "").split(":");
  const field = SORTABLE_FIELDS.has(rawField) ? rawField : "name";
  const dir = rawDir === "asc" ? "asc" : "desc";
  return { [field]: dir };
}

async function getDepartments(companyId, query = {}) {
  const {
    search,
    sort = "name:asc",
    page,
    pageSize,
    createdFrom,
    createdTo,
  } = query;

  const where = { companyId };

  if (search) {
    where.name = { contains: search, mode: "insensitive" };
  }

  if (createdFrom || createdTo) {
    where.createdAt = {};
    if (createdFrom) {
      const from = new Date(createdFrom);
      if (!Number.isNaN(from.getTime())) {
        from.setHours(0, 0, 0, 0);
        where.createdAt.gte = from;
      }
    }
    if (createdTo) {
      const to = new Date(createdTo);
      if (!Number.isNaN(to.getTime())) {
        to.setHours(23, 59, 59, 999);
        where.createdAt.lte = to;
      }
    }
  }

  // If pagination params are provided, use paginated mode
  if (page && pageSize) {
    const pageNum = Math.max(1, parseInt(page) || 1);
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize) || 20));
    const skip = (pageNum - 1) * pageSizeNum;

    const orderBy = parseSort(sort);

    const [items, total] = await Promise.all([
      prisma.department.findMany({
        where,
        include: {
          _count: {
            select: { users: true },
          },
        },
        orderBy,
        skip,
        take: pageSizeNum,
      }),
      prisma.department.count({ where }),
    ]);

    const enrichedItems = items.map((item) => ({
      ...item,
      userCount: item._count.users,
    }));

    return { items: enrichedItems, total, page: pageNum, pageSize: pageSizeNum };
  }

  // No pagination — return all (for dropdowns / backward compat)
  const items = await prisma.department.findMany({
    where,
    include: {
      _count: {
        select: { users: true },
      },
    },
    orderBy: { name: "asc" },
  });
  const enrichedItems = items.map((item) => ({
    ...item,
    userCount: item._count.users,
  }));
  return { items: enrichedItems, total: items.length, page: 1, pageSize: items.length };
}

async function createDepartment(companyId, name, maxEmployees) {
  const trimmed = name.trim();
  if (!trimmed) throw new ApiError(400, "Department name is required");

  const maxEmp = parseInt(maxEmployees, 10);
  if (!maxEmp || maxEmp < 1) throw new ApiError(400, "Max employees must be at least 1");

  const existing = await prisma.department.findUnique({
    where: { companyId_name: { companyId, name: trimmed } },
  });
  if (existing) throw new ApiError(409, "Department already exists");

  return prisma.department.create({
    data: { name: trimmed, maxEmployees: maxEmp, companyId },
  });
}

async function updateDepartment(companyId, departmentId, data) {
  const updates = {};
  if (data.name !== undefined) {
    const trimmed = String(data.name).trim();
    if (!trimmed) throw new ApiError(400, "Department name is required");
    updates.name = trimmed;

    const duplicate = await prisma.department.findFirst({
      where: { companyId, name: trimmed, id: { not: departmentId } },
    });
    if (duplicate) throw new ApiError(409, "Department name already exists");
  }
  if (data.maxEmployees !== undefined) {
    const maxEmp = parseInt(data.maxEmployees, 10);
    if (!maxEmp || maxEmp < 1) throw new ApiError(400, "Max employees must be at least 1");
    updates.maxEmployees = maxEmp;
  }

  const dept = await prisma.department.findFirst({
    where: { id: departmentId, companyId },
  });
  if (!dept) throw new ApiError(404, "Department not found");

  return prisma.department.update({
    where: { id: departmentId },
    data: updates,
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
