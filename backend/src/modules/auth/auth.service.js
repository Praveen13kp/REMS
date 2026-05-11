const prisma = require("../../config/prisma");


// ================= SIGNUP =================

const signupService = async (data) => {

  const existingUser = await prisma.user.findUnique({
    where: {
      email: data.email,
    },
  });

  if (existingUser) {
    throw new Error("User already exists");
  }

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: data.password,
      role: data.role,
      companyId: data.companyId,
    },
  });

  return user;
};


// ================= LOGIN =================

const loginService = async (email) => {

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    throw new Error("Invalid credentials");
  }

  return user;
};

module.exports = {
  signupService,
  loginService,
};