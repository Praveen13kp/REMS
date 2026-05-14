const express = require("express");
const { authMiddleware } = require("../../middleware/authMiddleware");
const { tenantMiddleware } = require("../../middleware/tenantMiddleware");
const {
  listNotes,
  createNote,
  updateNote,
  deleteNote,
} = require("./note.controller");

const router = express.Router();

router.use(authMiddleware, tenantMiddleware);

router.get("/", listNotes);
router.post("/", createNote);
router.patch("/:id", updateNote);
router.delete("/:id", deleteNote);

module.exports = router;
