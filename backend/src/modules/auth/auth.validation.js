const { z } = require("zod");

const superadminLoginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

const tenantLoginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
  companySlug: z.string().min(1, "Company slug is required"),
});

const validateSuperadminLogin = (data) => superadminLoginSchema.safeParse(data);
const validateTenantLogin = (data) => tenantLoginSchema.safeParse(data);

module.exports = { validateSuperadminLogin, validateTenantLogin };
