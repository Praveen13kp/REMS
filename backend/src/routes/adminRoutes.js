const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const rbacMiddleware = require("../middleware/rbacMiddleware");


// ADMIN ONLY ROUTE

router.get(
  "/dashboard",

  authMiddleware,

  rbacMiddleware("ADMIN"),

  (req, res) => {

    res.json({
      success: true,
      message: "Welcome Admin Dashboard",
    });

  }
);

module.exports = router;