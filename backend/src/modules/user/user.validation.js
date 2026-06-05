const { z } = require("zod");

// Letters + combining marks (any script — supports non-Latin names like
// Devanagari/Tamil/Arabic), spaces, apostrophes, dots and hyphens. No
// digits or other symbols.
const NAME_REGEX = /^[\p{L}\p{M}\s'.-]+$/u;
const NAME_MSG = "Name can only contain letters";

const inviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["ADMIN", "MANAGER", "AGENT"]),
  name: z
    .string()
    .regex(NAME_REGEX, NAME_MSG)
    .optional()
    .or(z.literal("")),
  dept: z.string().optional(),
  departmentIds: z.array(z.string()).optional(),
});

const inviteBrokerSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z
    .string()
    .regex(NAME_REGEX, NAME_MSG)
    .optional()
    .or(z.literal("")),
});

const acceptInviteSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .regex(NAME_REGEX, NAME_MSG),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-zA-Z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

// Optional leading "+" and 8–15 digits — accepts both E.164 (+919876543210)
// and locally-entered numbers (9876543210) so editing pre-existing records
// doesn't 400.
const PHONE_REGEX = /^\+?\d{8,15}$/;

const updateUserSchema = z.object({
  role: z.enum(["OWNER", "ADMIN", "MANAGER", "AGENT"]).optional(),
  isActive: z.boolean().optional(),
  name: z
    .string()
    .regex(NAME_REGEX, NAME_MSG)
    .optional()
    .or(z.literal("")),
  dept: z.string().optional().nullable(),
  departmentIds: z.array(z.string()).optional(),
  image: z.string().optional().nullable(),
  phone: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : v))
    .refine((v) => v === null || v === undefined || PHONE_REGEX.test(v), {
      message: "Enter a valid phone number",
    }),
});

const updateMeSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(NAME_REGEX, NAME_MSG)
    .optional(),
  phone: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : v))
    .refine((v) => v === null || v === undefined || PHONE_REGEX.test(v), {
      message: "Enter a valid phone number",
    }),
  dept: z.string().optional().nullable(),
  departmentIds: z.array(z.string()).optional(),
  image: z.string().optional().nullable(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters")
    .regex(/[a-zA-Z]/, "New password must contain at least one letter")
    .regex(/[0-9]/, "New password must contain at least one number"),
});

const validateInvite = (data) => inviteSchema.safeParse(data);
const validateInviteBroker = (data) => inviteBrokerSchema.safeParse(data);
const validateAcceptInvite = (data) => acceptInviteSchema.safeParse(data);
const validateUpdateUser = (data) => updateUserSchema.safeParse(data);
const validateUpdateMe = (data) => updateMeSchema.safeParse(data);
const validateChangePassword = (data) => changePasswordSchema.safeParse(data);

module.exports = {
  validateInvite,
  validateInviteBroker,
  validateAcceptInvite,
  validateUpdateUser,
  validateUpdateMe,
  validateChangePassword,
};
