const express = require("express");
const { authMiddleware } = require("../../middleware/authMiddleware");
const { tenantMiddleware } = require("../../middleware/tenantMiddleware");
const {
  list,
  create,
  reschedule,
  complete,
  remove,
} = require("./followUp.controller");

const router = express.Router();

router.use(authMiddleware, tenantMiddleware);

router.get("/", list);
router.post("/", create);
router.patch("/:id", reschedule);
router.post("/:id/complete", complete);
router.delete("/:id", remove);

module.exports = router;
