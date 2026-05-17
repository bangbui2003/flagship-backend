import { FastifyPluginAsync } from "fastify";
import { segmentRoutes } from "./routes.js";

const segmentsPlugin: FastifyPluginAsync = async (fastify) => {
  await segmentRoutes(fastify);
};

export default segmentsPlugin;
