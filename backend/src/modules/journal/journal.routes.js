const express = require("express");
const { authMiddleware } = require("../../middleware/authMiddleware");
const { tenantMiddleware } = require("../../middleware/tenantMiddleware");
const ctrl = require("./journal.controller");

const router = express.Router();
router.use(authMiddleware, tenantMiddleware);

router.get("/", ctrl.listByDate);
router.post("/", ctrl.create);
router.delete("/:id", ctrl.remove);
router.get("/note-counts", ctrl.noteCounts);
router.get("/day-summary", ctrl.daySummary);

module.exports = router;
