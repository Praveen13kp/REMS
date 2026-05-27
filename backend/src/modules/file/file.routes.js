const express = require("express");
const multer = require("multer");
const { authMiddleware } = require("../../middleware/authMiddleware");
const { tenantMiddleware } = require("../../middleware/tenantMiddleware");
const {
  listFiles,
  listFolders,
  getUsage,
  uploadFile,
  downloadFile,
  deleteFile,
  createShareLink,
  downloadShared,
  sendToLead,
} = require("./file.controller");
const { MAX_FILE_SIZE } = require("./file.service");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
});

// Public share download — token-based, no auth. Anyone with the link gets the
// file until shareExpiresAt elapses. Mounted before authMiddleware on purpose.
router.get("/share/:token", downloadShared);

router.use(authMiddleware, tenantMiddleware);

router.get("/folders", listFolders);
router.get("/usage", getUsage);
router.get("/", listFiles);
router.post("/", upload.single("file"), uploadFile);
router.get("/:id/download", downloadFile);
router.post("/:id/share", createShareLink);
router.post("/:id/send-to-lead", sendToLead);
router.delete("/:id", deleteFile);

module.exports = router;
