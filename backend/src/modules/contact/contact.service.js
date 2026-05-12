const prisma = require("../../config/prisma");

async function createSubmission({ name, email, company, phone, message, source, ip, userAgent }) {
  return prisma.contactSubmission.create({
    data: {
      name,
      email,
      company: company || null,
      phone: phone || null,
      message,
      source: source || null,
      ip: ip || null,
      userAgent: userAgent || null,
    },
  });
}

module.exports = { createSubmission };
