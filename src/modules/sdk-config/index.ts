import { FastifyInstance } from "fastify";
import sdkConfigRoutes from "./routes.js";

export default async function (fastify: FastifyInstance) {
  fastify.register(sdkConfigRoutes, { prefix: "/v1/sdk" });
}
