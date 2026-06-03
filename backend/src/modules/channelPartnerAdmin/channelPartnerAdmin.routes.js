const express = require("express");
const { authMiddleware } = require("../../middleware/authMiddleware");
const { requireRole, requireModule } = require("../../middleware/rbacMiddleware");
const c = require("./channelPartnerAdmin.controller");

const router = express.Router();
router.use(authMiddleware, requireRole("OWNER", "ADMIN", "MANAGER"));
router.use(requireModule("Channel Partners"));

router.get("/", c.list);
router.get("/:id", c.getOne);
router.post("/:id/revoke", c.revoke);
router.post("/:id/reactivate", c.reactivate);
// Owner/Manager sends one of their leads to this CP. Body: { leadId, visibility }
router.post("/:id/share-lead", c.shareLead);

module.exports = router;
