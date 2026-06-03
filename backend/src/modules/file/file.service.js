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
  lead: { select: { id: true, name: true } },
  project: { select: { id: true, name: true } },
};

function shapeFile(f) {
  return {
    id: f.id,
    name: f.name,
    folder: f.folder,
    mimeType: f.mimeType,
    sizeBytes: f.sizeBytes,
    leadId: f.leadId,
    projectId: f.projectId,
    createdAt: f.createdAt,
    uploader: f.uploader
      ? {
          id: f.uploader.id,
          name: f.uploader.name,
          email: f.uploader.email,
          image: f.uploader.image,
        }
      : null,
    lead: f.lead ? { id: f.lead.id, name: f.lead.name } : null,
    project: f.project ? { id: f.project.id, name: f.project.name } : null,
    shareToken: f.shareToken || null,
    shareExpiresAt: f.shareExpiresAt || null,
  };
}

async function listFilesService(tenantPrisma, query) {
  const {
    folder,
    search,
    leadId,
    projectId,
    uploaderId,
    page = "1",
    pageSize = "20",
  } = query;
  const pageNum = Math.max(1, parseInt(page) || 1);
  const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize) || 20));
  const skip = (pageNum - 1) * pageSizeNum;

  const where = {};
  if (folder && folder !== "all") where.folder = folder;
  if (leadId) where.leadId = leadId;
  if (projectId) where.projectId = projectId;
  if (uploaderId) where.uploaderId = uploaderId;
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
  const projectId = body?.projectId || null;

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
      projectId,
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

async function getFileForDownloadService(tenantPrisma, fileId, restrictUploaderId) {
  const where = { id: fileId };
  // Channel partners may only fetch files they uploaded themselves.
  if (restrictUploaderId) where.uploaderId = restrictUploaderId;
  const file = await tenantPrisma.file.findFirst({ where });
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

// 14-day share window — long enough for a lead to download at their leisure,
// short enough that the link doesn't live forever in WhatsApp chat history.
const SHARE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

async function createShareLinkService(tenantPrisma, fileId) {
  const file = await tenantPrisma.file.findFirst({ where: { id: fileId } });
  if (!file) throw new ApiError(404, "File not found");

  const stillValid =
    file.shareToken &&
    file.shareExpiresAt &&
    file.shareExpiresAt.getTime() > Date.now();

  let token = file.shareToken;
  let expiresAt = file.shareExpiresAt;
  if (!stillValid) {
    token = crypto.randomBytes(24).toString("base64url");
    expiresAt = new Date(Date.now() + SHARE_TTL_MS);
    await tenantPrisma.file.updateMany({
      where: { id: fileId },
      data: { shareToken: token, shareExpiresAt: expiresAt },
    });
  }
  return { token, expiresAt };
}

// Public download — no auth. Used by share links shared over WhatsApp / SMS.
// Tenant scoping isn't applied here (the lead doesn't have an account), so we
// gate exclusively on the secret token + expiry.
async function getFileByShareTokenService(token) {
  const prisma = require("../../config/prisma");
  const file = await prisma.file.findUnique({ where: { shareToken: token } });
  if (!file) throw new ApiError(404, "Share link not found");
  if (!file.shareExpiresAt || file.shareExpiresAt.getTime() <= Date.now()) {
    throw new ApiError(410, "Share link has expired");
  }
  const absPath = path.join(UPLOAD_ROOT, file.storageKey);
  if (!fsSync.existsSync(absPath)) {
    throw new ApiError(410, "File no longer exists on disk");
  }
  return { file, absPath };
}

async function sendFileToLeadService(
  tenantPrisma,
  fileId,
  { leadId, subject, body },
  { actorId, actorRole, companyId },
) {
  const { sendMail } = require("../../lib/mail");
  const { isPrivacyRestricted } = require("../lead/leadPrivacy");
  if (isPrivacyRestricted(actorRole)) {
    throw new ApiError(403, "Your role can't send files to leads");
  }

  const file = await tenantPrisma.file.findFirst({ where: { id: fileId } });
  if (!file) throw new ApiError(404, "File not found");

  const lead = await tenantPrisma.lead.findFirst({ where: { id: leadId } });
  if (!lead) throw new ApiError(404, "Lead not found");
  if (!lead.email) {
    throw new ApiError(400, "Lead has no email address on file");
  }

  const absPath = path.join(UPLOAD_ROOT, file.storageKey);
  if (!fsSync.existsSync(absPath)) {
    throw new ApiError(410, "File no longer exists on disk");
  }

  const finalSubject = (subject || `${file.name}`).trim();
  const finalBody =
    (body || `Hi ${lead.name || "there"},\n\nPlease find the attached document.\n\nThanks.`).trim();
  const htmlBody = finalBody
    .split(/\n/)
    .map((l) => l || "&nbsp;")
    .join("<br>");

  const prisma = require("../../config/prisma");
  const actor = await prisma.user.findUnique({
    where: { id: actorId },
    select: { email: true },
  });

  try {
    await sendMail({
      to: lead.email,
      subject: finalSubject,
      text: finalBody,
      html: htmlBody,
      replyTo: actor?.email,
      companyId,
      attachments: [{ filename: file.name, path: absPath }],
    });
  } catch (err) {
    throw new ApiError(
      502,
      err?.message?.includes("not configured")
        ? "Your company SMTP isn't configured yet. Add it in Settings → Email (SMTP)."
        : `Failed to send email: ${err?.message || "unknown error"}`,
    );
  }

  await logActivity(tenantPrisma, {
    leadId,
    userId: actorId,
    type: "EMAIL",
    content: `Sent file "${file.name}" to ${lead.email}`,
    metadata: { fileId, kind: "FILE_SENT", subject: finalSubject, to: lead.email },
  });
  await tenantPrisma.lead.updateMany({
    where: { id: leadId },
    data: { lastContactedAt: new Date() },
  });

  return { sent: true, to: lead.email, subject: finalSubject };
}

module.exports = {
  listFilesService,
  listFoldersService,
  getUsageService,
  uploadFileService,
  getFileForDownloadService,
  deleteFileService,
  createShareLinkService,
  getFileByShareTokenService,
  sendFileToLeadService,
  MAX_FILE_SIZE,
  UPLOAD_ROOT,
};
