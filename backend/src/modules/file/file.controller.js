const path = require("path");
const {
  listFilesService,
  listFoldersService,
  getUsageService,
  uploadFileService,
  getFileForDownloadService,
  deleteFileService,
  createShareLinkService,
  getFileByShareTokenService,
  sendFileToLeadService,
} = require("./file.service");

// Channel partners collaborate inside a company but must not be able to
// browse that company's entire file repository — they only see and manage
// the documents they uploaded themselves. Force-scope their list to their
// own uploads regardless of any client-supplied filter.
function scopedFileQuery(req) {
  if ((req.user.role === "CHANNEL_PARTNER" || req.user.role === "BROKER")) {
    return { ...req.query, uploaderId: req.user.id };
  }
  return req.query;
}

// Tenant users carry their own companyId; channel partners have it resolved
// from ?companyId= by tenantMiddleware and exposed as req.resolvedCompanyId.
function requestCompanyId(req) {
  return req.user.companyId || req.resolvedCompanyId || null;
}

async function listFiles(req, res, next) {
  try {
    const data = await listFilesService(req.tenantPrisma, scopedFileQuery(req));
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

async function listFolders(req, res, next) {
  try {
    const data = await listFoldersService(req.tenantPrisma);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

async function getUsage(req, res, next) {
  try {
    const data = await getUsageService(req.tenantPrisma, requestCompanyId(req));
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

async function uploadFile(req, res, next) {
  try {
    const file = await uploadFileService(
      req.tenantPrisma,
      req.file,
      requestCompanyId(req),
      req.user.id,
      req.body,
    );
    res.status(201).json({ ok: true, data: file });
  } catch (err) {
    next(err);
  }
}

async function downloadFile(req, res, next) {
  try {
    const { file, absPath } = await getFileForDownloadService(
      req.tenantPrisma,
      req.params.id,
      // CPs may only download files they uploaded (see scopedFileQuery).
      (req.user.role === "CHANNEL_PARTNER" || req.user.role === "BROKER") ? req.user.id : undefined,
    );
    res.setHeader("Content-Type", file.mimeType);

    // If ?inline=true is passed, or if it's an image/pdf and no param is
    // specified, try to show in-browser. Otherwise force download.
    const forceInline = req.query.inline === "true"
    const forceDownload = req.query.download === "true"
    const canInline =
      file.mimeType.startsWith("image/") ||
      file.mimeType === "application/pdf" ||
      file.mimeType.startsWith("text/")

    const disposition =
      !forceDownload && (forceInline || canInline) ? "inline" : "attachment"

    res.setHeader(
      "Content-Disposition",
      `${disposition}; filename="${file.name.replace(/"/g, "")}"`,
    );
    // Allow cross-origin <img> from the FE dev server / configured origins.
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.sendFile(path.resolve(absPath));
  } catch (err) {
    next(err);
  }
}

async function deleteFile(req, res, next) {
  try {
    const result = await deleteFileService(
      req.tenantPrisma,
      req.params.id,
      req.user,
    );
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function createShareLink(req, res, next) {
  try {
    const { token, expiresAt } = await createShareLinkService(
      req.tenantPrisma,
      req.params.id,
    );
    const base =
      process.env.API_PUBLIC_URL ||
      `${req.protocol}://${req.get("host")}/api`;
    res.json({
      ok: true,
      data: {
        token,
        expiresAt,
        url: `${base.replace(/\/$/, "")}/files/share/${token}`,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function downloadShared(req, res, next) {
  try {
    const { file, absPath } = await getFileByShareTokenService(req.params.token);
    res.setHeader("Content-Type", file.mimeType);
    const inline =
      req.query.inline === "true" ||
      file.mimeType.startsWith("image/") ||
      file.mimeType === "application/pdf";
    res.setHeader(
      "Content-Disposition",
      `${inline ? "inline" : "attachment"}; filename="${file.name.replace(/"/g, "")}"`,
    );
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.sendFile(path.resolve(absPath));
  } catch (err) {
    next(err);
  }
}

async function sendToLead(req, res, next) {
  try {
    const data = await sendFileToLeadService(
      req.tenantPrisma,
      req.params.id,
      {
        leadId: req.body?.leadId,
        subject: req.body?.subject,
        body: req.body?.body,
      },
      {
        actorId: req.user.id,
        actorRole: req.user.role,
        companyId: requestCompanyId(req),
      },
    );
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listFiles,
  listFolders,
  getUsage,
  uploadFile,
  downloadFile,
  deleteFile,
  createShareLink,
  downloadShared,
  sendToLead,
};
