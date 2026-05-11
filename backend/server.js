require("dotenv").config();

const app = require("./src/app");
const { initAuth } = require("./src/lib/auth");
const { env } = require("./src/lib/env");
const { logger } = require("./src/lib/logger");

async function start() {
  const { handler } = await initAuth();

  app.all("/api/auth/{*any}", handler);

  app.listen(env.PORT, () => {
    logger.info(`Server running on port ${env.PORT}`);
  });
}

start().catch((err) => {
  logger.error(err, "Failed to start server");
  process.exit(1);
});
