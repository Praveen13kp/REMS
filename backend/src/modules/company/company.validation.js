const { z } = require("zod");

const registerSchema = z.object({
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  companyType: z.enum(["DEVELOPER", "BROKERAGE", "CHANNEL_PARTNER", "INDIVIDUAL"]),
  city: z.string().optional(),
  ownerName: z.string().optional(),
  ownerEmail: z.string().email("Invalid email address"),
  ownerPhone: z.string().optional(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-zA-Z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

const updateCompanySchema = z.object({
  name: z.string().min(2).optional(),
  logoUrl: z.string().url().optional().nullable(),
  brandColor: z.string().optional().nullable(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  onboardingCompleted: z.boolean().optional(),
});

const validateRegister = (data) => registerSchema.safeParse(data);
const validateUpdateCompany = (data) => updateCompanySchema.safeParse(data);

module.exports = { validateRegister, validateUpdateCompany };