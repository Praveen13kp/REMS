const { z } = require("zod");

const inviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["ADMIN", "MANAGER", "AGENT"]),
  name: z.string().optional(),
});

const acceptInviteSchema = z.object({
  name: z.string().min(1, "Name is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-zA-Z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

const updateUserSchema = z.object({
  role: z.enum(["OWNER", "ADMIN", "MANAGER", "AGENT"]).optional(),
  isActive: z.boolean().optional(),
  name: z.string().optional(),
});

const validateInvite = (data) => inviteSchema.safeParse(data);
const validateAcceptInvite = (data) => acceptInviteSchema.safeParse(data);
const validateUpdateUser = (data) => updateUserSchema.safeParse(data);

module.exports = { validateInvite, validateAcceptInvite, validateUpdateUser };