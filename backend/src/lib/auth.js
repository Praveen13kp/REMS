let _auth;
let _handler;
let _fromNodeHeaders;

async function initAuth() {
  if (_auth) return { auth: _auth, handler: _handler, fromNodeHeaders: _fromNodeHeaders };

  const { betterAuth } = await import("better-auth");
  const { prismaAdapter } = await import("better-auth/adapters/prisma");
  const { toNodeHandler, fromNodeHeaders } = await import("better-auth/node");

  const prisma = require("../config/prisma");
  const { env } = require("./env");

  _auth = betterAuth({
    database: prismaAdapter(prisma, {
      provider: "postgresql",
    }),
    emailAndPassword: {
      enabled: true,
    },
    trustedOrigins: [env.FRONTEND_URL],
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
      },
    },
  });

  _handler = toNodeHandler(_auth.handler);
  _fromNodeHeaders = fromNodeHeaders;

  return { auth: _auth, handler: _handler, fromNodeHeaders: _fromNodeHeaders };
}

module.exports = { initAuth };
