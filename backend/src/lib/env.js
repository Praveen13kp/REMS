const { z } = require("zod");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  // Comma-separated list of allowed frontend origins (CORS + better-auth).
  // Each item must be a valid URL; whitespace around commas is trimmed.
  FRONTEND_URL: z
    .string()
    .default("http://localhost:5173")
    .refine(
      (v) =>
        v
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .every((u) => /^https?:\/\/.+/i.test(u)),
      { message: "FRONTEND_URL must be a URL or comma-separated URLs" },
    ),

  // Optional cookie Domain for the session cookie. Set to a leading-dot
  // registrable domain (e.g. ".localbhai.com") to share the login session
  // across every subdomain (app + api). Leave unset for host-only cookies.
  // Only takes effect in HTTPS deployments.
  COOKIE_DOMAIN: z.string().optional(),

  // SMTP — optional. If missing, mail.js falls back to console-logging
  // outgoing mails so the invite flow still works in dev without creds.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  SMTP_FROM: z.string().optional(),
  CONTACT_INBOX: z.string().email().optional(),

  // Google OAuth — optional. If either is missing, the Google sign-in
  // button on the frontend stays disabled (better-auth won't register the
  // provider). Get credentials from https://console.cloud.google.com →
  // APIs & Services → Credentials → OAuth 2.0 Client ID (Web application).
  // Authorized redirect URI must match GOOGLE_CALLBACK_URL, or:
  //   BETTER_AUTH_URL + /api/auth/google/callback
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().url().optional(),

  // 32-byte symmetric key used to AES-256-GCM-encrypt tenant-supplied API
  // credentials at rest (Meta, Google Ads, IndiaMART, etc.). Generate once:
  //   openssl rand -base64 32
  // and put the base64 string in .env. Do NOT commit. Required; the
  // integrations module throws at request time if it's missing.
  INTEGRATION_ENCRYPTION_KEY: z
    .string()
    .min(1, "INTEGRATION_ENCRYPTION_KEY is required (32 random bytes, base64)"),

  // Meta Graph API version used by drivers/meta.driver.js. Override if Meta
  // deprecates v19.0; default tracks the current stable.
  META_GRAPH_API_VERSION: z.string().default("v19.0"),

  // Razorpay credentials. Optional at boot so the dev environment doesn't
  // crash before keys are provisioned; the billing module gracefully 503s
  // any subscription endpoint until both keys are set. Plan IDs are also
  // env-driven because they're created once per Razorpay account; we don't
  // hardcode them into the source.
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  RAZORPAY_PLAN_PRO_MONTHLY: z.string().optional(),
  RAZORPAY_PLAN_PRO_ANNUAL: z.string().optional(),
  RAZORPAY_PLAN_ENTERPRISE_MONTHLY: z.string().optional(),
  RAZORPAY_PLAN_ENTERPRISE_ANNUAL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

const env = parsed.data;

const normalizeFrontendOrigins = (value) => {
  const origins = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const expanded = new Set(origins);
  for (const origin of origins) {
    try {
      const url = new URL(origin);
      if (url.hostname === "localhost") {
        url.hostname = "127.0.0.1";
        expanded.add(url.toString().replace(/\/$/, ""));
      } else if (url.hostname === "127.0.0.1") {
        url.hostname = "localhost";
        expanded.add(url.toString().replace(/\/$/, ""));
      }
    } catch {
      // Keep the original entry only; validation already rejects bad URLs.
    }
  }

  return [...expanded];
};

module.exports = { env, normalizeFrontendOrigins };
