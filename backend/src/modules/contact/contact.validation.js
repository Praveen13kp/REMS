const { z } = require("zod");

// Letters + combining marks (any script), spaces, apostrophes, dots and
// hyphens — no digits.
const NAME_REGEX = /^[\p{L}\p{M}\s'.-]+$/u;
// Optional leading "+" and 8–15 digits (E.164 or locally-entered).
const PHONE_REGEX = /^\+?\d{8,15}$/;

const submitSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(120, "Name too long")
    .regex(NAME_REGEX, "Name can only contain letters"),
  email: z.string().email("Invalid email address"),
  company: z.string().trim().max(120).optional().nullable(),
  phone: z
    .string()
    .trim()
    .max(40)
    .optional()
    .nullable()
    .refine(
      (v) => v === null || v === undefined || v === "" || PHONE_REGEX.test(v),
      { message: "Enter a valid phone number" },
    ),
  message: z.string().trim().min(1, "Message is required").max(2000, "Message too long"),
  source: z.string().trim().max(120).optional().nullable(),
});

const validateSubmit = (data) => submitSchema.safeParse(data);

module.exports = { validateSubmit };
