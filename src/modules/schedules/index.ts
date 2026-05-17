import { FastifyInstance } from "fastify";
import scheduleRoutes from "./routes.js";

export default async function schedulesModule(fastify: FastifyInstance) {
  // Register schedule routes under /v1/projects/:projectId/schedules
  fastify.register(scheduleRoutes, { prefix: "/v1/projects/:projectId/schedules" });
}
