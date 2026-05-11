const { betterAuth } = require("better-auth");

const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
  },

  trustedOrigins: [
    "http://localhost:5173",
  ],
});

module.exports = auth;