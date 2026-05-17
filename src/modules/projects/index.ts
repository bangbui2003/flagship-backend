import { FastifyInstance } from "fastify";
import projectRoutes from "./routes.js";

export default async function (fastify: FastifyInstance) {
  fastify.register(projectRoutes, { prefix: "/v1/projects" });
}
