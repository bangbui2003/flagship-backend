import { FastifyInstance } from "fastify";
import routes from "./routes.js";

export default async function (fastify: FastifyInstance) {
  // Register flags routes under projects - RESTful nested resource
  fastify.register(routes, { prefix: "/v1/projects/:projectId/flags" });
}
