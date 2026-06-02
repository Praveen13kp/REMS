const { z } = require("zod");

const NAME_REGEX = /^[a-zA-ZÀ-ÖØ-öø-ÿ\s'.-]+$/;

const submitSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(120, "Name too long")
    .regex(NAME_REGEX, "Name cannot contain numbers"),
  email: z.string().email("Invalid email address"),
  company: z.string().trim().max(120).optional().nullable(),
  phone: z
    .string()
    .trim()
    .max(40)
    .optional()
    .nullable()
    .refine(
      (v) => v === null || v === undefined || v === "" || /^\+\d{1,4}\d{8,15}$/.test(v),
      { message: "Enter a valid phone number" },
    ),
  message: z.string().trim().min(1, "Message is required").max(2000, "Message too long"),
  source: z.string().trim().max(120).optional().nullable(),
});

const validateSubmit = (data) => submitSchema.safeParse(data);

module.exports = { validateSubmit };
