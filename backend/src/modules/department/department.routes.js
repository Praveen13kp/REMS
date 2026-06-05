const express = require("express");
const { authMiddleware } = require("../../middleware/authMiddleware");
const { requireRole } = require("../../middleware/rbacMiddleware");
const {
  listDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  setUserDepartments,
  getMyDepartments,
  getUserDepartments,
} = require("./department.controller");

const router = express.Router();

// List departments is available to all authenticated users (needed for profile/select)
router.get("/", authMiddleware, listDepartments);

// Get current user's departments (profile)
router.get("/me", authMiddleware, getMyDepartments);

// Get a specific user's departments (owner/admin/manager)
router.get("/user/:userId", authMiddleware, requireRole("OWNER", "ADMIN"), getUserDepartments);

// Owner-only CRUD
router.post("/", authMiddleware, requireRole("OWNER"), createDepartment);
router.patch("/:id", authMiddleware, requireRole("OWNER"), updateDepartment);
router.delete("/:id", authMiddleware, requireRole("OWNER"), deleteDepartment);

// Owner-only: set departments for a user
router.put("/user/:userId", authMiddleware, requireRole("OWNER"), setUserDepartments);

module.exports = router;
