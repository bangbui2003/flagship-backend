import { FastifyPluginAsync } from "fastify";
import { auditLogRoutes } from "./routes.js";

const auditLogsPlugin: FastifyPluginAsync = async (fastify) => {
  await auditLogRoutes(fastify);
};

export default auditLogsPlugin;
