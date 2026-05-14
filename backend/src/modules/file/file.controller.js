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
    const data = await getUsageService(req.tenantPrisma);
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
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${file.name.replace(/"/g, "")}"`,
    );
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
