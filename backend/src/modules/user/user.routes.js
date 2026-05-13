const express = require("express");
const { authMiddleware } = require("../../middleware/authMiddleware");
const { requireRole } = require("../../middleware/rbacMiddleware");
const {
  invite,
  getInvite,
  acceptInvite,
  getAllUsers,
  getUser,
  updateUser,
  getMe,
  updateMe,
  workload,
  changePassword,
} = require("./user.controller");

const router = express.Router();

router.post("/invite", authMiddleware, requireRole("OWNER", "ADMIN"), invite);
router.get("/invite/:token", getInvite);
router.post("/invite/:token/accept", acceptInvite);
router.get("/me", authMiddleware, getMe);
router.patch("/me", authMiddleware, updateMe);
router.post("/me/change-password", authMiddleware, changePassword);
router.get("/workload", authMiddleware, requireRole("OWNER", "ADMIN", "MANAGER"), workload);
router.get("/", authMiddleware, requireRole("OWNER", "ADMIN", "MANAGER"), getAllUsers);
router.get("/:id", authMiddleware, requireRole("OWNER", "ADMIN", "MANAGER"), getUser);
router.patch("/:id", authMiddleware, requireRole("OWNER", "ADMIN"), updateUser);

module.exports = router;