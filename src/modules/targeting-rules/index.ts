import { FastifyInstance } from "fastify";
import targetingRuleRoutes from "./routes.js";

export default async function (fastify: FastifyInstance) {
  // Support both patterns
  fastify.register(targetingRuleRoutes, {
    prefix: "/v1/projects/:projectId/flags/:flagId/environments/:environmentId/versions/:flagVersionId/rules",
  });
}
