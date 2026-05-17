import { FastifyInstance } from "fastify";
import environmentRoutes from "./routes.js";

export default async function (fastify: FastifyInstance) {
  fastify.register(environmentRoutes, {
    prefix: "/v1/projects/:projectId/environments",
  });
}
