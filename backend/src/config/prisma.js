const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const pg = require("pg");
const { env } = require("../lib/env");

const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

module.exports = prisma;
