import { FastifyInstance } from "fastify";
import flagVersionRoutes from "./routes.js";

export default async function (fastify: FastifyInstance) {
  fastify.register(flagVersionRoutes, {
    prefix: "/v1/projects/:projectId/flags/:flagId/environments/:environmentId/versions",
  });
}
