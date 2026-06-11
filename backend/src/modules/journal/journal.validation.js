const { z } = require("zod");

const createJournalSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
});

module.exports = { createJournalSchema };
