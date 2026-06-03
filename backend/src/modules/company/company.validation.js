const { z } = require("zod");
const { PLAN_CODES } = require("../../lib/planLimits");

// Letters + combining marks (any script), spaces, apostrophes, dots and
// hyphens — no digits.
const NAME_REGEX = /^[\p{L}\p{M}\s'.-]+$/u;
// Optional leading "+" and 8–15 digits (E.164 or locally-entered).
const PHONE_REGEX = /^\+?\d{8,15}$/;

const registerSchema = z.object({
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  // companyType moved out of signup — the user fills it later from
  // Profile so signup stays light. Still accepted here so old clients
  // / scripts that pass it don't break.
  companyType: z
    .enum(["DEVELOPER", "BROKERAGE", "CHANNEL_PARTNER", "INDIVIDUAL"])
    .optional(),
  city: z.string().optional(),
  ownerName: z
    .string()
    .regex(NAME_REGEX, "Name can only contain letters")
    .optional()
    .or(z.literal("")),
  ownerEmail: z.string().email("Invalid email address"),
  ownerPhone: z
    .string()
    .optional()
    .refine(
      (v) => v === undefined || v === "" || PHONE_REGEX.test(v),
      { message: "Enter a valid phone number" },
    ),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-zA-Z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  // Plan picked from the pricing page. We accept it but the company starts
  // on FREE in the DB regardless — paid plans only activate once Razorpay
  // confirms payment. We persist the intent so the billing page can prompt
  // them to complete checkout right after signup.
  plan: z.enum(PLAN_CODES).optional(),
  billingCycle: z.enum(["monthly", "annual"]).optional(),
});

const updateCompanySchema = z.object({
  name: z.string().min(2).optional(),
  type: z
    .enum(["DEVELOPER", "BROKERAGE", "CHANNEL_PARTNER", "INDIVIDUAL"])
    .optional()
    .nullable(),
  logoUrl: z.string().url().optional().nullable(),
  brandColor: z.string().optional().nullable(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  industry: z.string().max(100).optional().nullable(),
  dateFormat: z.string().max(20).optional().nullable(),
  language: z.string().max(40).optional().nullable(),
  onboardingCompleted: z.boolean().optional(),
});

// SMTP config — every field optional so the user can clear / partial-save.
// password is intentionally not validated as required: blank means "keep
// existing", set clearPassword:true to wipe.
const smtpConfigSchema = z.object({
  host: z.string().trim().min(1).optional().nullable(),
  // `z.coerce.number()` chokes when fed `null` — it coerces to 0 and trips
  // `min(1)`. Allow null explicitly so the FE can blank the field out.
  port: z
    .union([z.coerce.number().int().min(1).max(65535), z.null()])
    .optional(),
  secure: z.boolean().optional(),
  username: z.string().trim().min(1).optional().nullable(),
  password: z.string().optional().nullable(),
  clearPassword: z.boolean().optional(),
  fromEmail: z
    .string()
    .email("Invalid 'From email' address")
    .optional()
    .nullable()
    .or(z.literal("")),
  fromName: z.string().optional().nullable(),
});

// SMTP test — accepts the *unsaved* form values, all optional + nullable
// (the FE sends `null` for blank fields, not `undefined`). If host is missing
// the service falls back to the saved config. recipientEmail defaults to the
// caller's own email.
const smtpTestSchema = z.object({
  host: z.string().trim().min(1).optional().nullable(),
  port: z
    .union([z.coerce.number().int().min(1).max(65535), z.null()])
    .optional(),
  secure: z.boolean().optional().nullable(),
  username: z.string().trim().min(1).optional().nullable(),
  password: z.string().optional().nullable(),
  fromEmail: z
    .string()
    .email("Invalid 'From email' address")
    .optional()
    .nullable()
    .or(z.literal("")),
  fromName: z.string().optional().nullable(),
  recipientEmail: z
    .string()
    .email("Invalid recipient email")
    .optional()
    .nullable(),
});

const validateRegister = (data) => registerSchema.safeParse(data);
const validateUpdateCompany = (data) => updateCompanySchema.safeParse(data);
const validateSmtpConfig = (data) => smtpConfigSchema.safeParse(data);
const validateSmtpTest = (data) => smtpTestSchema.safeParse(data);

module.exports = {
  validateRegister,
  validateUpdateCompany,
  validateSmtpConfig,
  validateSmtpTest,
};