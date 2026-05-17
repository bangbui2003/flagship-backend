import { PrismaPg } from "@prisma/adapter-pg"; // PostgreSQL adapter for Prisma
import { PrismaClient } from "@prisma/client"; // Main Prisma database client
import fp from "fastify-plugin"; // Wrap this as a Fastify plugin

declare module "fastify" {
  interface FastifyInstance {
    db: PrismaClient; // Tell TypeScript that fastify has a `db` property
  }
}

export default fp(async (fastify) => {
  const dbUrl = process.env.DATABASE_URL; // Read DB connection string from env

  if (!dbUrl) {
    fastify.log.error("DATABASE_URL is not defined in environment variables");
    throw new Error("DATABASE_URL is missing"); // Stop early if config is missing
  }

  const adapter = new PrismaPg({
    connectionString: dbUrl, // Create PostgreSQL adapter
  });

  const prisma = new PrismaClient({
    adapter, // Prisma will use this adapter to talk to Postgres
    log: ["query", "info", "warn", "error"], // Enable logs for debugging/visibility
  });

  try {
    await prisma.$connect(); // Connect immediately during startup
    fastify.log.info("Database connection established");
  } catch (err) {
    fastify.log.error(err, "Failed to connect to database");
    process.exit(1); // Kill the app if DB connection fails
  }

  fastify.decorate("db", prisma); // Make Prisma available as fastify.db

  fastify.addHook("onClose", async (server) => {
    fastify.log.info("Disconnecting from database...");
    await server.db.$disconnect(); // Clean up DB connection on shutdown
  });
});
