const prisma = require("../../config/prisma");


// ================= CREATE LEAD =================

const createLeadService = async (data) => {

  const lead = await prisma.lead.create({
    data,
  });

  return lead;
};


// ================= GET ALL LEADS =================

const getAllLeadsService = async () => {

  const leads = await prisma.lead.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  return leads;
};


// ================= GET SINGLE LEAD =================

const getLeadByIdService = async (id) => {

  const lead = await prisma.lead.findUnique({
    where: {
      id,
    },
  });

  if (!lead) {
    throw new Error("Lead not found");
  }

  return lead;
};


// ================= UPDATE LEAD =================

const updateLeadService = async (id, data) => {

  const updatedLead = await prisma.lead.update({
    where: {
      id,
    },

    data,
  });

  return updatedLead;
};


// ================= DELETE LEAD =================

const deleteLeadService = async (id) => {

  await prisma.lead.delete({
    where: {
      id,
    },
  });

  return true;
};

module.exports = {
  createLeadService,
  getAllLeadsService,
  getLeadByIdService,
  updateLeadService,
  deleteLeadService,
};