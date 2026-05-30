const { z } = require("zod");

const TASK_STATUSES = ["PENDING", "COMPLETED"];

const futureOrNowDate = z
  .string()
  .datetime({ offset: true })
  .transform((v) => new Date(v))
  .refine((d) => d >= new Date(new Date().toDateString()), {
    message: "dueAt must be current or future",
  });

const createTaskSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters").max(200, "Title must be at most 200 characters"),
  description: z.string().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
  leadId: z.string().optional().nullable(),
  // Optional CRM-project link — a task can be scoped to a Project (e.g.
  // "site visit prep for Skyline Heights") independently of any lead.
  projectId: z.string().optional().nullable(),
  dueAt: futureOrNowDate.optional().nullable(),
});

const updateTaskSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().optional().nullable(),
  dueAt: futureOrNowDate.optional().nullable(),
  status: z.enum(TASK_STATUSES).optional(),
  assignedToId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
});

const validateCreateTask = (data) => createTaskSchema.safeParse(data);
const validateUpdateTask = (data) => updateTaskSchema.safeParse(data);

module.exports = {
  TASK_STATUSES,
  validateCreateTask,
  validateUpdateTask,
};
