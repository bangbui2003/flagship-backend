import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import AutoLoad, { AutoloadPluginOptions } from "@fastify/autoload";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import { FastifyPluginAsync, FastifyServerOptions } from "fastify";

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface AppOptions
  extends FastifyServerOptions, Partial<AutoloadPluginOptions> {}

const options: AppOptions = {};

const app: FastifyPluginAsync<AppOptions> = async (
  fastify,
  opts,
): Promise<void> => {
  // Enable CORS for frontend
  await fastify.register(cors, {
    origin: true, // Allow all origins in development
    credentials: true,
  });

  // Enable cookie parsing
  await fastify.register(cookie, {
    secret: process.env.COOKIE_SECRET || "flagship-secret-key-change-in-production",
  });

  // Load core infrastructure plugins first (db, cache, logger, http utilities)
  // eslint-disable-next-line no-void
  void fastify.register(AutoLoad, {
    dir: join(__dirname, "core"),
    options: opts,
  });

  // Then load domain modules (each module should export a Fastify plugin)
  // eslint-disable-next-line no-void
  void fastify.register(AutoLoad, {
    dir: join(__dirname, "modules"),
    options: opts,
    dirNameRoutePrefix: false,
  });
};

export default app;
export { app, options };
