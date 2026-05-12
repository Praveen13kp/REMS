const { z } = require("zod");

const createLeadSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z
    .string()
    .min(10, "Phone must be at least 10 digits")
    .transform((v) => v.replace(/[\s-]/g, "")),
  email: z.string().email().optional().nullable(),
  source: z.string().optional().nullable(),
  requirementType: z.string().optional().nullable(),
  budget: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  interestedProjectId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  assignedToId: z.string().optional().nullable(),
});

const updateLeadSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z
    .string()
    .min(10, "Phone must be at least 10 digits")
    .transform((v) => v.replace(/[\s-]/g, ""))
    .optional(),
  email: z.string().email().optional().nullable(),
  source: z.string().optional().nullable(),
  requirementType: z.string().optional().nullable(),
  budget: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  interestedProjectId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  assignedToId: z.string().optional().nullable(),
});

const checkDuplicatesSchema = z.object({
  phone: z
    .string()
    .min(10, "Phone must be at least 10 digits")
    .transform((v) => v.replace(/[\s-]/g, ""))
    .optional(),
  email: z.string().email().optional(),
  name: z.string().optional(),
  city: z.string().optional(),
});

const validateCreateLead = (data) => createLeadSchema.safeParse(data);
const validateUpdateLead = (data) => updateLeadSchema.safeParse(data);
const validateCheckDuplicates = (data) => checkDuplicatesSchema.safeParse(data);

module.exports = { validateCreateLead, validateUpdateLead, validateCheckDuplicates };
