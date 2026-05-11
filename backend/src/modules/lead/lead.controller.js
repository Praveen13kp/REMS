const {
  createLeadService,
  getAllLeadsService,
  getLeadByIdService,
  updateLeadService,
  deleteLeadService,
} = require("./lead.service");


// ================= CREATE LEAD =================

const createLead = async (req, res) => {

  try {

    const lead = await createLeadService(req.body);

    res.status(201).json({
      success: true,
      message: "Lead created successfully",
      data: lead,
    });

  } catch (error) {

    res.status(400).json({
      success: false,
      message: error.message,
    });

  }
};


// ================= GET ALL LEADS =================

const getAllLeads = async (req, res) => {

  try {

    const leads = await getAllLeadsService();

    res.status(200).json({
      success: true,
      data: leads,
    });

  } catch (error) {

    res.status(400).json({
      success: false,
      message: error.message,
    });

  }
};


// ================= GET LEAD BY ID =================

const getLeadById = async (req, res) => {

  try {

    const lead = await getLeadByIdService(req.params.id);

    res.status(200).json({
      success: true,
      data: lead,
    });

  } catch (error) {

    res.status(404).json({
      success: false,
      message: error.message,
    });

  }
};


// ================= UPDATE LEAD =================

const updateLead = async (req, res) => {

  try {

    const updatedLead = await updateLeadService(
      req.params.id,
      req.body
    );

    res.status(200).json({
      success: true,
      message: "Lead updated successfully",
      data: updatedLead,
    });

  } catch (error) {

    res.status(400).json({
      success: false,
      message: error.message,
    });

  }
};


// ================= DELETE LEAD =================

const deleteLead = async (req, res) => {

  try {

    await deleteLeadService(req.params.id);

    res.status(200).json({
      success: true,
      message: "Lead deleted successfully",
    });

  } catch (error) {

    res.status(400).json({
      success: false,
      message: error.message,
    });

  }
};

module.exports = {
  createLead,
  getAllLeads,
  getLeadById,
  updateLead,
  deleteLead,
};