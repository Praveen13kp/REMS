const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const createContactSubmission = async (data) => {
  return prisma.contactSubmission.create({
    data: {
      name: data.name,
      email: data.email,
      company: data.company || null,
      phone: data.phone || null,
      message: data.message,
      source: data.source || null,
      ip: data.ip || null,
      userAgent: data.userAgent || null,
    },
  });
};

module.exports = {
  createContactSubmission,
};