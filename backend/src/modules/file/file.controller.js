const path = require("path");
const {
  listFilesService,
  listFoldersService,
  getUsageService,
  uploadFileService,
  getFileForDownloadService,
  deleteFileService,
} = require("./file.service");

async function listFiles(req, res, next) {
  try {
    const data = await listFilesService(req.tenantPrisma, req.query);
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
    const data = await getUsageService(req.tenantPrisma, req.user.companyId);
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
      req.user.companyId,
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
    );
    res.setHeader("Content-Type", file.mimeType);
    const isImage = file.mimeType.startsWith("image/");
    res.setHeader(
      "Content-Disposition",
      `${isImage ? "inline" : "attachment"}; filename="${file.name.replace(/"/g, "")}"`,
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

module.exports = {
  listFiles,
  listFolders,
  getUsage,
  uploadFile,
  downloadFile,
  deleteFile,
};
