const { z } = require("zod");

const LEAD_STATUSES = [
  "New",
  "Contacted",
  "Interested",
  "Site Visit",
  "Negotiation",
  "Booked",
  "Lost",
];

const LEAD_PRIORITIES = ["Hot", "Warm", "Cold"];

const isoDateOptional = z
  .union([z.string().datetime({ offset: true }), z.string().length(0), z.null()])
  .optional()
  .transform((v) => (v && v.length > 0 ? new Date(v) : null));

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
  status: z.enum(LEAD_STATUSES).optional(),
  priority: z.enum(LEAD_PRIORITIES).optional().nullable(),
  possessionTimeline: z.string().optional().nullable(),
  nextFollowUpAt: isoDateOptional,
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
  priority: z.enum(LEAD_PRIORITIES).optional().nullable(),
  possessionTimeline: z.string().optional().nullable(),
  nextFollowUpAt: isoDateOptional,
});

const assignLeadSchema = z.object({
  assignedToId: z.string().min(1, "assignedToId is required"),
  reason: z.string().optional(),
});

const bulkAssignSchema = z.object({
  leadIds: z.array(z.string()).min(1, "At least one leadId is required"),
  assignedToId: z.string().min(1, "assignedToId is required"),
  reason: z.string().optional(),
});

const autoAssignSchema = z.object({
  leadIds: z.array(z.string()).optional(),
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
const validateAssignLead = (data) => assignLeadSchema.safeParse(data);
const validateBulkAssign = (data) => bulkAssignSchema.safeParse(data);
const validateAutoAssign = (data) => autoAssignSchema.safeParse(data);
const validateCheckDuplicates = (data) => checkDuplicatesSchema.safeParse(data);

module.exports = {
  LEAD_STATUSES,
  LEAD_PRIORITIES,
  validateCreateLead,
  validateUpdateLead,
  validateAssignLead,
  validateBulkAssign,
  validateAutoAssign,
  validateCheckDuplicates,
};
