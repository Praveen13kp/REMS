const { z } = require("zod");

const projectTypes = ["RESIDENTIAL", "COMMERCIAL", "PLOT", "VILLA", "MIXED"];

const createProjectSchema = z.object({
  name: z.string().min(2).max(120),
  location: z.string().min(1),
  type: z.enum(projectTypes),
  priceRange: z.string().optional(),
  description: z.string().optional(),
  reraNumber: z.string().optional(),
  possessionDate: z.string().optional(),
  coverImageUrl: z.string().optional(),
});

const updateProjectSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  location: z.string().min(1).optional(),
  type: z.enum(projectTypes).optional(),
  priceRange: z.string().optional(),
  description: z.string().optional(),
  reraNumber: z.string().optional(),
  possessionDate: z.string().optional(),
  coverImageUrl: z.string().optional(),
});

module.exports = { createProjectSchema, updateProjectSchema };