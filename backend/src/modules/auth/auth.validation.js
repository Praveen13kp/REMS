const { z } = require("zod");

const superadminLoginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

const tenantLoginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
  companyId: z.string().min(1).optional(),
});

const validateSuperadminLogin = (data) => superadminLoginSchema.safeParse(data);
const validateTenantLogin = (data) => tenantLoginSchema.safeParse(data);

module.exports = { validateSuperadminLogin, validateTenantLogin };
