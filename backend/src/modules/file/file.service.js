const fs = require("fs/promises");
const fsSync = require("fs");
const path = require("path");
const crypto = require("crypto");
const { ApiError } = require("../../lib/ApiError");
const { logActivity } = require("../activity/activity.service");
const { assertWithinLimit, getCompanyPlan } = require("../../lib/planGate");
const planService = require("../plan/plan.service");

const UPLOAD_ROOT =
  process.env.UPLOAD_ROOT || path.join(__dirname, "../../../uploads");

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const BYTES_PER_GB = 1024 * 1024 * 1024; // GiB — what plan limits use

const ALLOWED_MIME_PREFIXES = [
  "image/",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument",
  "application/vnd.ms-excel",
  "text/",
  "video/mp4",
];

function isAllowedMime(mime) {
  if (!mime) return false;
  return ALLOWED_MIME_PREFIXES.some((p) => mime.startsWith(p));
}

function ensureSafeFilename(name) {
  return path.basename(name).replace(/[^\w.\-() ]+/g, "_");
}

const FILE_INCLUDE = {
  uploader: { select: { id: true, name: true, email: true, image: true } },
};

function shapeFile(f) {
  return {
    id: f.id,
    name: f.name,
    folder: f.folder,
    mimeType: f.mimeType,
    sizeBytes: f.sizeBytes,
    leadId: f.leadId,
    createdAt: f.createdAt,
    uploader: f.uploader
      ? {
          id: f.uploader.id,
          name: f.uploader.name,
          email: f.uploader.email,
          image: f.uploader.image,
        }
      : null,
  };
}

async function listFilesService(tenantPrisma, query) {
  const {
    folder,
    search,
    leadId,
    page = "1",
    pageSize = "20",
  } = query;
  const pageNum = Math.max(1, parseInt(page) || 1);
  const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize) || 20));
  const skip = (pageNum - 1) * pageSizeNum;

  const where = {};
  if (folder && folder !== "all") where.folder = folder;
  if (leadId) where.leadId = leadId;
  if (search) where.name = { contains: search, mode: "insensitive" };

  const [items, total] = await Promise.all([
    tenantPrisma.file.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSizeNum,
      include: FILE_INCLUDE,
    }),
    tenantPrisma.file.count({ where }),
  ]);

  return {
    items: items.map(shapeFile),
    total,
    page: pageNum,
    pageSize: pageSizeNum,
  };
}

async function listFoldersService(tenantPrisma) {
  const rows = await tenantPrisma.file.groupBy({
    by: ["folder"],
    _count: { _all: true },
    orderBy: { folder: "asc" },
  });
  return rows.map((r) => ({ name: r.folder, count: r._count._all }));
}

async function getUsageService(tenantPrisma, companyId) {
  const [agg, planCode] = await Promise.all([
    tenantPrisma.file.aggregate({ _sum: { sizeBytes: true } }),
    getCompanyPlan(companyId),
  ]);
  const used = agg._sum.sizeBytes ?? 0;
  const limitBytes = await planService.getLimit(planCode, "storageBytes"); // null = unlimited

  const toGb = (b) => +(b / BYTES_PER_GB).toFixed(2);
  const usedGb = toGb(used);

  return {
    plan: planCode,
    usedBytes: used,
    limitBytes,                       // null when unlimited
    unlimited: limitBytes == null,
    used: usedGb,
    limit: limitBytes == null ? null : toGb(limitBytes),
    unit: "GB",
    percent:
      limitBytes == null
        ? 0
        : Math.min(100, Math.round((used / limitBytes) * 100)),
  };
}

async function uploadFileService(tenantPrisma, file, companyId, userId, body) {
  if (!file) throw new ApiError(400, "File is required (field name: 'file')");
  if (!isAllowedMime(file.mimetype)) {
    throw new ApiError(415, `Unsupported file type: ${file.mimetype}`);
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new ApiError(413, "File too large", {
      code: "FILE_TOO_LARGE",
      details: { limit: MAX_FILE_SIZE },
    });
  }

  // Plan cap: refuse the upload if it would push the tenant past their
  // storage quota. Uses the file's own size as the increment so a single
  // huge upload that overshoots is rejected upfront rather than half-written.
  await assertWithinLimit(companyId, "storageBytes", file.size);

  const folder = (body?.folder || "general").toString().slice(0, 64);
  const leadId = body?.leadId || null;

  const dir = path.join(UPLOAD_ROOT, companyId, folder);
  await fs.mkdir(dir, { recursive: true });

  const safeName = ensureSafeFilename(file.originalname);
  const ext = path.extname(safeName);
  const storageKey = path.posix.join(
    companyId,
    folder,
    `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`,
  );
  const absPath = path.join(UPLOAD_ROOT, storageKey);

  await fs.writeFile(absPath, file.buffer);

  const created = await tenantPrisma.file.create({
    data: {
      uploaderId: userId,
      folder,
      name: safeName,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      storageKey,
      leadId,
    },
    include: FILE_INCLUDE,
  });

  if (leadId) {
    await logActivity(tenantPrisma, {
      leadId,
      userId,
      type: "SYSTEM",
      content: `File uploaded: ${safeName}`,
      metadata: { fileId: created.id, kind: "FILE_UPLOADED" },
    });
  }

  return shapeFile(created);
}

async function getFileForDownloadService(tenantPrisma, fileId) {
  const file = await tenantPrisma.file.findFirst({ where: { id: fileId } });
  if (!file) throw new ApiError(404, "File not found");

  const absPath = path.join(UPLOAD_ROOT, file.storageKey);
  if (!fsSync.existsSync(absPath)) {
    throw new ApiError(410, "File no longer exists on disk");
  }

  return { file, absPath };
}

async function deleteFileService(tenantPrisma, fileId, requestingUser) {
  const file = await tenantPrisma.file.findFirst({ where: { id: fileId } });
  if (!file) throw new ApiError(404, "File not found");

  const isUploader = file.uploaderId === requestingUser.id;
  const isAdmin =
    requestingUser.role === "OWNER" || requestingUser.role === "ADMIN";
  if (!isUploader && !isAdmin) {
    throw new ApiError(403, "You can only delete your own files");
  }

  const absPath = path.join(UPLOAD_ROOT, file.storageKey);

  await tenantPrisma.file.delete({ where: { id: fileId } });

  if (file.leadId) {
    await logActivity(tenantPrisma, {
      leadId: file.leadId,
      userId: requestingUser.id,
      type: "SYSTEM",
      content: `File deleted: ${file.name}`,
      metadata: { fileId, kind: "FILE_DELETED" },
    });
  }

  try {
    await fs.unlink(absPath);
  } catch (err) {
    if (err.code !== "ENOENT") {
      // Log but don't fail — DB row gone is the source of truth
      // eslint-disable-next-line no-console
      console.warn(`Failed to delete file from disk: ${absPath}`, err);
    }
  }

  return { id: fileId };
}

module.exports = {
  listFilesService,
  listFoldersService,
  getUsageService,
  uploadFileService,
  getFileForDownloadService,
  deleteFileService,
  MAX_FILE_SIZE,
  UPLOAD_ROOT,
};
