import { FastifyInstance } from "fastify";
import analyticsRoutes from "./routes.js";

export default async function analyticsModule(fastify: FastifyInstance) {
  // Register analytics routes under /v1/projects/:projectId/analytics
  fastify.register(analyticsRoutes, { prefix: "/v1/projects/:projectId/analytics" });
}
