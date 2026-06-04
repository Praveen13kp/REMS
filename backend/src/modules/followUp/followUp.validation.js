const { z } = require("zod");

const isoDate = z.string().refine(
  (v) => !Number.isNaN(new Date(v).getTime()),
  { message: "Invalid date" },
);

const OUTCOMES = ["CALLED", "NO_ANSWER", "WHATSAPP", "EMAILED", "MET", "OTHER"];

const createSchema = z.object({
  leadId: z.string().min(1, "leadId is required"),
  scheduledAt: isoDate,
  notes: z.string().max(2000).optional().nullable(),
});

const rescheduleSchema = z.object({
  scheduledAt: isoDate,
  notes: z.string().max(2000).optional().nullable(),
});

const completeSchema = z.object({
  outcome: z.enum(OUTCOMES).optional(),
  notes: z.string().max(2000).optional().nullable(),
});

const listQuerySchema = z.object({
  bucket: z.enum(["today", "missed", "upcoming", "all"]).optional(),
  scope: z.enum(["mine", "all"]).optional(),
  leadId: z.string().optional(),
  search: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  source: z.string().optional(),
  assignedToId: z.string().optional(),
  projectId: z.string().optional(),
  scheduledFrom: z.string().optional(),
  scheduledTo: z.string().optional(),
  sort: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(500).default(50),
  completed: z.preprocess(
    (v) => v === "true" || v === true,
    z.boolean().optional(),
  ),
});

module.exports = {
  OUTCOMES,
  validateCreate: (d) => createSchema.safeParse(d),
  validateReschedule: (d) => rescheduleSchema.safeParse(d),
  validateComplete: (d) => completeSchema.safeParse(d),
  validateListQuery: (d) => listQuerySchema.safeParse(d),
};
