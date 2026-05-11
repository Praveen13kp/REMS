const express = require("express");

const router = express.Router();

const {
  signup,
  login,
} = require("./auth.controller");


// SIGNUP

router.post("/signup", signup);


// LOGIN

router.post("/login", login);

module.exports = router;