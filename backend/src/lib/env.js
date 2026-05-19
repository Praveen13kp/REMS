const { z } = require("zod");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
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

  // Google OAuth — optional. If either is missing, the Google sign-in
  // button on the frontend stays disabled (better-auth won't register the
  // provider). Get credentials from https://console.cloud.google.com →
  // APIs & Services → Credentials → OAuth 2.0 Client ID (Web application).
  // Authorized redirect URI must match BETTER_AUTH_URL + /api/auth/callback/google
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
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
