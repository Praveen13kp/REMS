const express = require("express");
const { authMiddleware } = require("../../middleware/authMiddleware");
const { requireRole } = require("../../middleware/rbacMiddleware");
// User-cap enforcement now lives in user.service.createInvite via
// assertWithinLimit (Phase 2). The old planLimitMiddleware was deleted.
const {
  invite,
  inviteBroker,
  resendInvite,
  deleteInvite,
  getInvite,
  acceptInvite,
  getAllUsers,
  getUser,
  resetIp,
  updateUser,
  toggleActive,
  deleteUser,
  getMe,
  updateMe,
  workload,
  changePassword,
} = require("./user.controller");

const router = express.Router();

router.post("/invite", authMiddleware, requireRole("OWNER", "ADMIN", "MANAGER"), invite);
router.post("/invite-broker", authMiddleware, requireRole("OWNER", "ADMIN", "MANAGER"), inviteBroker);
router.post(
  "/invite/:id/resend",
  authMiddleware,
  // Same gate as creating and cancelling an invite — a MANAGER who can
  // create and delete an invite must also be able to resend it.
  requireRole("OWNER", "ADMIN", "MANAGER"),
  resendInvite,
);
router.delete(
  "/invite/:id",
  authMiddleware,
  requireRole("OWNER", "ADMIN", "MANAGER"),
  deleteInvite,
);
router.get("/invite/:token", getInvite);
router.post("/invite/:token/accept", acceptInvite);
router.get("/me", authMiddleware, getMe);
router.patch("/me", authMiddleware, updateMe);
router.post("/me/change-password", authMiddleware, changePassword);
router.get("/workload", authMiddleware, requireRole("OWNER", "ADMIN", "MANAGER"), workload);
router.get("/", authMiddleware, requireRole("OWNER", "ADMIN", "MANAGER"), getAllUsers);
router.get("/:id", authMiddleware, requireRole("OWNER", "ADMIN", "MANAGER"), getUser);
router.patch("/:id/active", authMiddleware, requireRole("OWNER", "ADMIN", "MANAGER"), toggleActive);
// Owner-only: clear a user's registered login IP so their next login
// re-registers a new device. Backend validation lives in ipGuard.
router.post("/:id/reset-ip", authMiddleware, requireRole("OWNER"), resetIp);
router.patch("/:id", authMiddleware, requireRole("OWNER", "ADMIN"), updateUser);
router.delete("/:id", authMiddleware, requireRole("OWNER"), deleteUser);

module.exports = router;
