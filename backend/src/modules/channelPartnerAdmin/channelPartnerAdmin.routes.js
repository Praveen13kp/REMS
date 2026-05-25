const express = require("express");
const { authMiddleware } = require("../../middleware/authMiddleware");
const { requireRole } = require("../../middleware/rbacMiddleware");
const c = require("./channelPartnerAdmin.controller");

const router = express.Router();
router.use(authMiddleware, requireRole("OWNER", "ADMIN", "MANAGER"));

router.get("/", c.list);
router.get("/:id", c.getOne);
router.post("/:id/revoke", c.revoke);
router.post("/:id/reactivate", c.reactivate);

module.exports = router;
