const { parse } = require("csv-parse/sync");
const { z } = require("zod");
const { ApiError } = require("../../lib/ApiError");
const { logActivity } = require("../activity/activity.service");

const MAX_ROWS = 5000;

const REQUIRED_HEADERS = ["name", "phone"];

const ALLOWED_HEADERS = [
  "name",
  "phone",
  "email",
  "source",
  "requirementType",
  "budget",
  "city",
  "interestedProjectName",
  "assignedToEmail",
  "notes",
  "tags",
];

// Maps common CSV header variations (case-insensitive) to the canonical
// field names the importer expects. Lets users upload Google Forms exports,
// Excel sheets, and other CRM dumps without hand-renaming columns.
const HEADER_ALIASES = {
  // name
  "full name": "name",
  "full_name": "name",
  "fullname": "name",
  "customer name": "name",
  "customer_name": "name",
  "lead name": "name",
  "lead_name": "name",
  "client name": "name",
  "client_name": "name",
  "contact name": "name",
  "contact_name": "name",
  "first name": "name",
  "first_name": "name",
  // phone
  "phone number": "phone",
  "phone_number": "phone",
  "phonenumber": "phone",
  "mobile": "phone",
  "mobile number": "phone",
  "mobile_number": "phone",
  "mobilenumber": "phone",
  "contact number": "phone",
  "contact_number": "phone",
  "contactnumber": "phone",
  "number": "phone",
  "cell": "phone",
  "telephone": "phone",
  "tel": "phone",
  "whatsapp": "phone",
  "whatsapp number": "phone",
  // email
  "email id": "email",
  "email_id": "email",
  "emailid": "email",
  "email address": "email",
  "email_address": "email",
  "emailaddress": "email",
  "mail": "email",
  "e-mail": "email",
  // source
  "lead source": "source",
  "lead_source": "source",
  // budget
  "budget range": "budget",
  "budget_range": "budget",
  "price range": "budget",
  "price_range": "budget",
  // city
  "location": "city",
  "area": "city",
  // requirement
  "requirement": "requirementType",
  "requirement type": "requirementType",
  "requirement_type": "requirementType",
  "property type": "requirementType",
  "property_type": "requirementType",
  // project
  "project": "interestedProjectName",
  "project name": "interestedProjectName",
  "project_name": "interestedProjectName",
  "interested project": "interestedProjectName",
  // status
  "status": "status",
  "lead status": "status",
  "lead_status": "status",
};

// Normalise CSV headers: lowercase, trim whitespace, map aliases to
// canonical names. Returns a new array of records with canonical keys.
function normaliseHeaders(records) {
  if (records.length === 0) return records;
  const origHeaders = Object.keys(records[0]);
  const mapping = {};
  for (const h of origHeaders) {
    const lower = h.toLowerCase().trim();
    // Exact canonical match
    if (ALLOWED_HEADERS.includes(lower)) {
      mapping[h] = lower;
    }
    // Alias match
    else if (HEADER_ALIASES[lower]) {
      mapping[h] = HEADER_ALIASES[lower];
    }
    // No match — pass through as-is (will be ignored by the filter step)
    else {
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
  phone: z.string().trim().min(7, "phone too short").max(20, "phone too long"),
  email: z
    .string()
    .trim()
    .email("invalid email")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  source: z.string().trim().optional().or(z.literal("").transform(() => undefined)),
  requirementType: z
    .string()
    .trim()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  budget: z.string().trim().optional().or(z.literal("").transform(() => undefined)),
  city: z.string().trim().optional().or(z.literal("").transform(() => undefined)),
  interestedProjectName: z
    .string()
    .trim()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  assignedToEmail: z
    .string()
    .trim()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  notes: z.string().trim().optional().or(z.literal("").transform(() => undefined)),
  tags: z
    .string()
    .trim()
    .optional()
    .or(z.literal("").transform(() => undefined))
    .transform((v) => (v ? v.split(";").map((t) => t.trim()).filter(Boolean) : [])),
});

function firstIssueMessage(error) {
  return (error.issues?.[0] ?? error.errors?.[0])?.message ?? "Invalid row";
}

async function importLeadsService(tenantPrisma, fileBuffer, userId, remainingCapacity = Infinity) {
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

  // Normalise before checking — "Full Name" → "name", "Phone Number" → "phone", etc.
  records = normaliseHeaders(records);

  const headers = Object.keys(records[0]);
  for (const req of REQUIRED_HEADERS) {
    if (!headers.includes(req)) {
      throw new ApiError(400, `Missing required column: ${req}`);
    }
  }

  const projectByName = new Map();
  const userByEmail = new Map();

  const details = [];
  let created = 0;
  let skipped = 0;
  let errors = 0;
  // Stop creating once we've burned the plan's remaining lead slots — every
  // subsequent row gets a SKIPPED entry so the user can see what happened
  // without us hitting the DB only to throw mid-loop.
  let planCapHit = 0;

  for (let i = 0; i < records.length; i++) {
    const rowNum = i + 2; // +1 for header, +1 for 1-indexed
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

    if (created >= remainingCapacity) {
      planCapHit++;
      details.push({
        row: rowNum,
        status: "SKIPPED",
        message: "Plan lead limit reached — upgrade to import more",
      });
      continue;
    }

    try {
      const existing = await tenantPrisma.lead.findFirst({
        where: {
          OR: [
            { phone: data.phone },
            ...(data.email
              ? [{ email: { equals: data.email, mode: "insensitive" } }]
              : []),
          ],
        },
        select: { id: true },
      });

      if (existing) {
        skipped++;
        details.push({
          row: rowNum,
          status: "SKIPPED",
          message: "Duplicate phone or email",
          leadId: existing.id,
        });
        continue;
      }

      let interestedProjectId = null;
      if (data.interestedProjectName) {
        const key = data.interestedProjectName.toLowerCase();
        if (!projectByName.has(key)) {
          const proj = await tenantPrisma.project.findFirst({
            where: {
              name: { equals: data.interestedProjectName, mode: "insensitive" },
            },
            select: { id: true },
          });
          projectByName.set(key, proj?.id ?? null);
        }
        interestedProjectId = projectByName.get(key);
      }

      let assignedToId = userId;
      if (data.assignedToEmail) {
        const key = data.assignedToEmail.toLowerCase();
        if (!userByEmail.has(key)) {
          const u = await tenantPrisma.user.findFirst({
            where: { email: { equals: data.assignedToEmail, mode: "insensitive" } },
            select: { id: true },
          });
          userByEmail.set(key, u?.id ?? null);
        }
        assignedToId = userByEmail.get(key) ?? userId;
      }

      const lead = await tenantPrisma.lead.create({
        data: {
          name: data.name,
          phone: data.phone,
          email: data.email || null,
          source: data.source || null,
          requirementType: data.requirementType || null,
          budget: data.budget || null,
          city: data.city || null,
          tags: data.tags,
          status: "New",
          interestedProjectId,
          assignedToId,
          createdById: userId,
        },
        select: { id: true, name: true },
      });

      await logActivity(tenantPrisma, {
        leadId: lead.id,
        userId,
        type: "SYSTEM",
        content: `Lead imported: ${lead.name}`,
        metadata: { source: "CSV_IMPORT" },
      });

      created++;
      details.push({ row: rowNum, status: "CREATED", leadId: lead.id });
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

module.exports = { importLeadsService, MAX_ROWS };
