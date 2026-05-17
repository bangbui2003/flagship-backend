import { FastifyInstance } from "fastify";
import flagVariationRoutes from "./routes.js";

export default async function (fastify: FastifyInstance) {
  fastify.register(flagVariationRoutes, {
    prefix: "/v1/projects/:projectId/flags/:flagId/variations",
  });
}
