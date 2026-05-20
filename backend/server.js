require("dotenv").config();

const app = require("./src/app");
const prisma = require("./src/config/prisma");
const { initAuth } = require("./src/lib/auth");
const { env } = require("./src/lib/env");
const { logger } = require("./src/lib/logger");

async function start() {
  const { handler } = await initAuth();

  const authRoutes = require("./src/modules/auth/auth.routes");
  app.use("/api/auth", authRoutes);

  app.post("/api/auth/sign-in/email", async (req, res, next) => {
    try {
      const email = req.body?.email?.toLowerCase();
      if (email) {
        const user = await prisma.user.findFirst({
          where: { email, deletedAt: null },
          select: { role: true },
        });
        if (user && (user.role === "SUPER_ADMIN" || user.role === "PLATFORM_ADMIN")) {
          return res.status(401).json({
            ok: false,
            error: { code: "UNAUTHORIZED", message: "Use the admin portal" },
          });
        }
      }
      next();
    } catch {
      next();
    }
  });

  app.all("/api/auth/{*any}", handler);

  // Kick off background pollers for pull-based integrations (JustDial,
  // IndiaMART) + hourly health-check probe for credential expiry.
  if (env.NODE_ENV !== "test") {
    require("./src/modules/integrations/pollers/scheduler").start();
    require("./src/modules/integrations/pollers/healthCheck.scheduler").start();
    require("./src/modules/lead/leadAging.scheduler").start();
  }

  app.listen(env.PORT, () => {
    logger.info(`Server running on port ${env.PORT}`);
  });
}

start().catch((err) => {
  logger.error(err, "Failed to start server");
  process.exit(1);
});
