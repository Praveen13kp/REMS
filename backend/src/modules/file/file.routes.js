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
} = require("./file.controller");
const { MAX_FILE_SIZE } = require("./file.service");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
});

router.use(authMiddleware, tenantMiddleware);

router.get("/folders", listFolders);
router.get("/usage", getUsage);
router.get("/", listFiles);
router.post("/", upload.single("file"), uploadFile);
router.get("/:id/download", downloadFile);
router.delete("/:id", deleteFile);

module.exports = router;
