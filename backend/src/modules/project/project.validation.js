const { z } = require("zod");

const projectTypes = ["RESIDENTIAL", "COMMERCIAL", "PLOT", "VILLA", "MIXED"];

const createProjectSchema = z.object({
  name: z.string().min(2).max(120),
  location: z.string().min(1),
  type: z.enum(projectTypes),
  priceRange: z.string().optional(),
  description: z.string().optional(),
  reraNumber: z.string().optional(),
  possessionDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "possessionDate must be a valid ISO date string",
  }).optional(),
  coverImageUrl: z.string().url().optional().nullable(),
});

const updateProjectSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  location: z.string().min(1).optional(),
  type: z.enum(projectTypes).optional(),
  priceRange: z.string().optional(),
  description: z.string().optional(),
  reraNumber: z.string().optional(),
  possessionDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "possessionDate must be a valid ISO date string",
  }).optional(),
  coverImageUrl: z.string().url().optional().nullable(),
});

const listQuerySchema = z.object({
  search: z.string().optional(),
  type: z.enum(projectTypes).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

const validateCreateProject = (data) => createProjectSchema.safeParse(data);
const validateUpdateProject = (data) => updateProjectSchema.safeParse(data);
const validateListQuery = (data) => listQuerySchema.safeParse(data);

module.exports = {
  validateCreateProject,
  validateUpdateProject,
  validateListQuery,
};
