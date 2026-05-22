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
});

module.exports = {
  OUTCOMES,
  validateCreate: (d) => createSchema.safeParse(d),
  validateReschedule: (d) => rescheduleSchema.safeParse(d),
  validateComplete: (d) => completeSchema.safeParse(d),
  validateListQuery: (d) => listQuerySchema.safeParse(d),
};
