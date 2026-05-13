const { z } = require("zod");

const submitSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120, "Name too long"),
  email: z.string().email("Invalid email address"),
  company: z.string().trim().max(120).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  message: z.string().trim().min(1, "Message is required").max(2000, "Message too long"),
  source: z.string().trim().max(120).optional().nullable(),
});

const validateSubmit = (data) => submitSchema.safeParse(data);

module.exports = { validateSubmit };
const contactSubmissionSchema = z.object({
  name: z.string().min(1, "Name is required").max(120, "Name must be less than 120 characters"),
  email: z.string().email("Invalid email address"),
  company: z.string().optional(),
  phone: z.string().optional(),
  message: z.string().min(1, "Message is required").max(2000, "Message must be less than 2000 characters"),
  source: z.string().optional(),
});

const validateContactSubmission = (data) => contactSubmissionSchema.safeParse(data);

module.exports = { validateContactSubmission };
