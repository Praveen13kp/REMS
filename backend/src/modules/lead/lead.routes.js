const express = require("express");

const router = express.Router();

const {
  createLead,
  getAllLeads,
  getLeadById,
  updateLead,
  deleteLead,
} = require("./lead.controller");


// CREATE

router.post("/", createLead);


// GET ALL

router.get("/", getAllLeads);


// GET SINGLE

router.get("/:id", getLeadById);


// UPDATE

router.put("/:id", updateLead);


// DELETE

router.delete("/:id", deleteLead);

module.exports = router;