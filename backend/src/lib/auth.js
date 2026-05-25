let _auth;
let _handler;
let _fromNodeHeaders;

async function initAuth() {
  if (_auth) return { auth: _auth, handler: _handler, fromNodeHeaders: _fromNodeHeaders };

  const { betterAuth } = await import("better-auth");
  const { prismaAdapter } = await import("better-auth/adapters/prisma");
  const { toNodeHandler, fromNodeHeaders } = await import("better-auth/node");

  const prisma = require("../config/prisma");
  const { env, normalizeFrontendOrigins } = require("./env");
  const { sendMail } = require("./mail");
  const { resetPasswordEmail } = require("./emails/resetPasswordEmail");
  const { logger } = require("./logger");

  // Google login is handled by the custom /api/auth/google flow so we can
  // create a tenant workspace for first-time OAuth users while still linking
  // Google to existing credential users by email.
  const googleEnabled = !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

  _auth = betterAuth({
    database: prismaAdapter(prisma, {
      provider: "postgresql",
    }),
    emailAndPassword: {
      enabled: true,
      sendResetPassword: async ({ user, url }) => {
        const mail = resetPasswordEmail({
          name: user?.name,
          resetLink: url,
          expiryMinutes: 30,
        });
        // Fire-and-forget so the API responds quickly even if SMTP stalls.
        sendMail({
          to: user.email,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
        })
          .then((r) => {
            if (r?.delivered) {
              logger.info({ email: user.email }, "Reset-password email sent");
            }
          })
          .catch((err) => {
            logger.error(
              { err, email: user.email },
              "Failed to send reset-password email",
            );
          });
      },
    },
    ...(googleEnabled
      ? {
          socialProviders: {
            google: {
              clientId: env.GOOGLE_CLIENT_ID,
              clientSecret: env.GOOGLE_CLIENT_SECRET,
              disableSignUp: true,
            },
          },
          account: {
            accountLinking: {
              enabled: true,
              trustedProviders: ["google"],
            },
          },
        }
      : {}),
    trustedOrigins: normalizeFrontendOrigins(env.FRONTEND_URL),
    user: {
      additionalFields: {
        role: {
          type: "string",
          required: true,
          defaultValue: "OWNER",
          input: false,
        },
        phone: {
          type: "string",
          required: false,
        },
        isActive: {
          type: "boolean",
          required: true,
          defaultValue: true,
          input: false,
        },
        provider: {
          type: "string",
          required: true,
          defaultValue: "CREDENTIAL",
          input: false,
        },
        providerId: {
          type: "string",
          required: false,
          input: false,
        },
        companyId: {
          type: "string",
          required: false,
          input: false,
        },
      },
    },
  });

  _handler = toNodeHandler(_auth.handler);
  _fromNodeHeaders = fromNodeHeaders;

  return { auth: _auth, handler: _handler, fromNodeHeaders: _fromNodeHeaders };
}

module.exports = { initAuth };
