import { FastifyInstance } from "fastify";
import eventRoutes from "./routes.js";

export default async function (fastify: FastifyInstance) {
  fastify.register(eventRoutes, { prefix: "/v1/events" });
}
