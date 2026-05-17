import { FastifyInstance } from "fastify";
import authRoutes from "./routes.js";

export default async function (fastify: FastifyInstance) {
  await fastify.register(authRoutes, { prefix: "/v1/auth" });
}
