const { parse } = require("csv-parse/sync");
const { z } = require("zod");
const { ApiError } = require("../../lib/ApiError");

const MAX_ROWS = 5000;

const PROJECT_TYPES = ["RESIDENTIAL", "COMMERCIAL", "PLOT", "VILLA", "MIXED"];

const REQUIRED_HEADERS = ["name", "location", "type"];

const ALLOWED_HEADERS = [
  "name",
  "location",
  "type",
  "priceRange",
  "description",
  "reraNumber",
  "possessionDate",
];

const HEADER_ALIASES = {
  "project name": "name",
  "project_name": "name",
  "projectname": "name",
  "property name": "name",
  "property_name": "name",
  "development name": "name",
  "development_name": "name",
  // location
  "address": "location",
  "project location": "location",
  "project_location": "location",
  "property location": "location",
  "property_location": "location",
  "city": "location",
  "area": "location",
  // type
  "project type": "type",
  "project_type": "type",
  "property type": "type",
  "property_type": "type",
  "category": "type",
  // priceRange
  "price range": "priceRange",
  "price_range": "priceRange",
  "price": "priceRange",
  "budget": "priceRange",
  "rate": "priceRange",
  // description
  "desc": "description",
  "details": "description",
  "about": "description",
  "notes": "description",
  // reraNumber
  "rera number": "reraNumber",
  "rera_number": "reraNumber",
  "rera": "reraNumber",
  "registration number": "reraNumber",
  "registration_number": "reraNumber",
  // possessionDate
  "possession date": "possessionDate",
  "possession_date": "possessionDate",
  "possession": "possessionDate",
  "delivery date": "possessionDate",
  "delivery_date": "possessionDate",
  "completion date": "possessionDate",
  "completion_date": "possessionDate",
};

function normaliseHeaders(records) {
  if (records.length === 0) return records;
  const origHeaders = Object.keys(records[0]);
  const mapping = {};
  for (const h of origHeaders) {
    const lower = h.toLowerCase().trim();
    if (ALLOWED_HEADERS.includes(lower)) {
      mapping[h] = lower;
    } else if (HEADER_ALIASES[lower]) {
      mapping[h] = HEADER_ALIASES[lower];
    } else {
      mapping[h] = lower;
    }
  }
  return records.map((row) => {
    const out = {};
    for (const [orig, canonical] of Object.entries(mapping)) {
      if (row[orig] !== undefined) out[canonical] = row[orig];
    }
    return out;
  });
}

const rowSchema = z.object({
  name: z.string().trim().min(2, "name must be at least 2 chars"),
  location: z.string().trim().min(1, "location is required"),
  type: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => PROJECT_TYPES.includes(v), {
      message: `type must be one of: ${PROJECT_TYPES.join(", ")}`,
    }),
  priceRange: z.string().trim().optional().or(z.literal("").transform(() => undefined)),
  description: z.string().trim().optional().or(z.literal("").transform(() => undefined)),
  reraNumber: z.string().trim().optional().or(z.literal("").transform(() => undefined)),
  possessionDate: z
    .string()
    .trim()
    .optional()
    .or(z.literal("").transform(() => undefined))
    .transform((v) => (v ? new Date(v) : undefined)),
});

function firstIssueMessage(error) {
  return (error.issues?.[0] ?? error.errors?.[0])?.message ?? "Invalid row";
}

async function importProjectsService(tenantPrisma, fileBuffer, companyId, remainingCapacity = Infinity) {
  if (!fileBuffer || fileBuffer.length === 0) {
    throw new ApiError(400, "Empty file");
  }

  let records;
  try {
    records = parse(fileBuffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });
  } catch (err) {
    throw new ApiError(400, `CSV parse error: ${err.message}`);
  }

  if (records.length === 0) {
    throw new ApiError(400, "CSV has no data rows");
  }

  if (records.length > MAX_ROWS) {
    throw new ApiError(413, `Too many rows. Max ${MAX_ROWS} per upload`, {
      code: "TOO_MANY_ROWS",
      details: { rowCount: records.length, limit: MAX_ROWS },
    });
  }

  records = normaliseHeaders(records);

  const headers = Object.keys(records[0]);
  for (const req of REQUIRED_HEADERS) {
    if (!headers.includes(req)) {
      throw new ApiError(400, `Missing required column: ${req}`);
    }
  }

  const details = [];
  let created = 0;
  let skipped = 0;
  let errors = 0;
  let planCapHit = 0;

  for (let i = 0; i < records.length; i++) {
    const rowNum = i + 2;
    const raw = records[i];

    const filtered = {};
    for (const k of ALLOWED_HEADERS) {
      if (raw[k] !== undefined) filtered[k] = raw[k];
    }

    const validation = rowSchema.safeParse(filtered);
    if (!validation.success) {
      errors++;
      details.push({
        row: rowNum,
        status: "ERROR",
        message: firstIssueMessage(validation.error),
      });
      continue;
    }

    const data = validation.data;

    // Check for duplicate by name (case-insensitive, same tenant)
    const existing = await tenantPrisma.project.findFirst({
      where: {
        name: { equals: data.name, mode: "insensitive" },
        companyId,
      },
      select: { id: true },
    });

    if (existing) {
      skipped++;
      details.push({
        row: rowNum,
        status: "SKIPPED",
        message: "Duplicate project name",
      });
      continue;
    }

    if (created >= remainingCapacity) {
      planCapHit++;
      details.push({
        row: rowNum,
        status: "SKIPPED",
        message: "Plan project limit reached — upgrade to import more",
      });
      continue;
    }

    try {
      await tenantPrisma.project.create({
        data: {
          name: data.name,
          location: data.location,
          type: data.type,
          priceRange: data.priceRange || null,
          description: data.description || null,
          reraNumber: data.reraNumber || null,
          possessionDate: data.possessionDate || null,
          companyId,
        },
      });

      created++;
      details.push({ row: rowNum, status: "CREATED" });
    } catch (err) {
      errors++;
      details.push({
        row: rowNum,
        status: "ERROR",
        message: err.message || "Internal error",
      });
    }
  }

  return {
    summary: { total: records.length, created, skipped, errors, planCapHit },
    details,
  };
}

module.exports = { importProjectsService, MAX_ROWS };
