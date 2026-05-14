const { z } = require("zod");

const createNoteSchema = z.object({
  leadId: z.string().min(1, "leadId is required"),
  content: z.string().min(1, "Content cannot be empty").max(5000, "Content too long"),
});

const updateNoteSchema = z.object({
  content: z.string().min(1, "Content cannot be empty").max(5000, "Content too long"),
});

const listQuerySchema = z.object({
  leadId: z.string().min(1, "leadId is required"),
});

const validateCreateNote = (data) => createNoteSchema.safeParse(data);
const validateUpdateNote = (data) => updateNoteSchema.safeParse(data);
const validateListQuery = (data) => listQuerySchema.safeParse(data);

module.exports = {
  validateCreateNote,
  validateUpdateNote,
  validateListQuery,
};
