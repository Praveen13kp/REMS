const express = require("express");
const { authMiddleware } = require("../../middleware/authMiddleware");
const { tenantMiddleware } = require("../../middleware/tenantMiddleware");
const { requireRole } = require("../../middleware/rbacMiddleware");
const { me, checkout, confirm } = require("./subscription.controller");

const router = express.Router();

router.use(authMiddleware, tenantMiddleware);

router.get("/me", me);
router.post("/checkout", requireRole("OWNER", "ADMIN"), checkout);
router.post("/confirm", requireRole("OWNER", "ADMIN"), confirm);

module.exports = router;
