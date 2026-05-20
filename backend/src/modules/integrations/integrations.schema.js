const { z } = require("zod");

// Provider enum mirrors the Prisma IntegrationProvider enum exactly.
const ProviderEnum = z.enum([
  "META",
  "GOOGLE_ADS",
  "WEBSITE_FORM",
  "JUSTDIAL",
  "INDIAMART",
]);

// Body for POST /api/integrations. The shape of `credentials` is
// provider-specific and validated by the matching driver's
// `credentialsSchema` inside the service layer — we accept any object here
// and delegate the actual validation downstream.
const createIntegrationBody = z.object({
  provider: ProviderEnum,
  label: z.string().min(1).max(100),
  credentials: z.record(z.any()),
});

// Body for PATCH /api/integrations/:id. All fields optional; only present
// keys are updated. Status can be flipped manually (mainly to re-activate
// after a tenant has fixed an INVALID credential).
const updateIntegrationBody = z.object({
  label: z.string().min(1).max(100).optional(),
  credentials: z.record(z.any()).optional(),
  status: z.enum(["ACTIVE", "INVALID", "EXPIRED", "REVOKED"]).optional(),
});

module.exports = { ProviderEnum, createIntegrationBody, updateIntegrationBody };
