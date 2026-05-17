import Fastify from "fastify";
import { app } from "./app.js";

const isProduction = process.env.NODE_ENV === "production";

const server = Fastify({
  logger: isProduction
    ? true // JSON logs in production
    : {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
          },
        },
      },
  trustProxy: true, // Trust proxy headers (for Railway, Render, etc.)
});

// Register app
server.register(app);

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 8080;
    const host = "0.0.0.0";

    await server.listen({ port, host });

    console.log(`🚀 Flagship Backend is running on http://localhost:${port}`);
    console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async (signal: string) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  await server.close();
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

start();
