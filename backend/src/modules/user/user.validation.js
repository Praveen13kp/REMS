const { z } = require("zod");

const NAME_REGEX = /^[a-zA-ZÀ-ÖØ-öø-ÿ\s'.-]+$/;

const inviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["ADMIN", "MANAGER", "AGENT"]),
  name: z
    .string()
    .regex(NAME_REGEX, "Name cannot contain numbers")
    .optional(),
  dept: z.string().optional(),
});

const inviteBrokerSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z
    .string()
    .regex(NAME_REGEX, "Name cannot contain numbers")
    .optional(),
});

const acceptInviteSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .regex(NAME_REGEX, "Name cannot contain numbers"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-zA-Z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

const PHONE_REGEX = /^\+\d{1,4}\d{8,15}$/;

const updateUserSchema = z.object({
  role: z.enum(["OWNER", "ADMIN", "MANAGER", "AGENT"]).optional(),
  isActive: z.boolean().optional(),
  name: z
    .string()
    .regex(NAME_REGEX, "Name cannot contain numbers")
    .optional(),
  dept: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  phone: z
    .string()
    .optional()
    .nullable()
    .refine((v) => v === null || v === undefined || PHONE_REGEX.test(v), {
      message: "Enter a valid phone number",
    }),
});

const updateMeSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(NAME_REGEX, "Name cannot contain numbers")
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
