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

// Lead.budget is stored as a free-text label ("₹50 L - ₹1 Cr", "Under ₹50 L",
// ...). The LeadEdit form historically sent it as Number(values.budget),
// which 400-ed against a strict string schema. Accept both, coerce to string,
// preserve null/empty.
const budgetField = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((v) => {
    if (v === null || v === undefined) return v;
    const s = String(v).trim();
    return s.length === 0 ? null : s;
  });

const createLeadSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z
    .string()
    .min(10, "Phone must be at least 10 digits")
    .transform((v) => v.replace(/[\s-]/g, "")),
  email: z
    .union([z.string().email(), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" ? null : v)),
  source: z.string().optional().nullable(),
  requirementType: z.string().optional().nullable(),
  budget: budgetField,
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
  email: z
    .union([z.string().email(), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" ? null : v)),
  source: z.string().optional().nullable(),
  requirementType: z.string().optional().nullable(),
  budget: budgetField,
  city: z.string().optional().nullable(),
  interestedProjectId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  assignedToId: z.string().optional().nullable(),
  priority: z.enum(LEAD_PRIORITIES).optional().nullable(),
  possessionTimeline: z.string().optional().nullable(),
  nextFollowUpAt: isoDateOptional,
});

// assignedToId may be null/empty to unassign the lead.
const assignLeadSchema = z.object({
  assignedToId: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => (typeof v === "string" && v.trim().length > 0 ? v : null)),
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

const transitionLeadSchema = z.object({
  toStatus: z.string().min(1, "toStatus is required"),
  reason: z.string().optional(),
});

const validateCreateLead = (data) => createLeadSchema.safeParse(data);
const validateUpdateLead = (data) => updateLeadSchema.safeParse(data);
const validateAssignLead = (data) => assignLeadSchema.safeParse(data);
const validateBulkAssign = (data) => bulkAssignSchema.safeParse(data);
const validateAutoAssign = (data) => autoAssignSchema.safeParse(data);
const validateCheckDuplicates = (data) => checkDuplicatesSchema.safeParse(data);
const validateTransitionLead = (data) => transitionLeadSchema.safeParse(data);

module.exports = {
  LEAD_STATUSES,
  LEAD_PRIORITIES,
  validateCreateLead,
  validateUpdateLead,
  validateAssignLead,
  validateBulkAssign,
  validateAutoAssign,
  validateCheckDuplicates,
  validateTransitionLead,
};
