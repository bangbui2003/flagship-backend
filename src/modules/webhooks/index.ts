import { FastifyInstance } from "fastify";
import webhookRoutes from "./routes.js";

export default async function (fastify: FastifyInstance) {
  fastify.register(webhookRoutes, {
    prefix: "/v1/projects/:projectId/webhooks",
  });
}
