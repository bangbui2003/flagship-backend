import { FastifyInstance } from "fastify";
import { AuditLogService } from "./service.js";
import {
  listAuditLogsSchema,
  getAuditLogSchema,
  getEntityAuditLogsSchema,
  type AuditLogQuerystring,
} from "./schema.js";

export async function auditLogRoutes(fastify: FastifyInstance) {
  // List audit logs for a project
  fastify.get<{
    Params: { projectId: string };
    Querystring: AuditLogQuerystring;
  }>(
    "/v1/projects/:projectId/audit-logs",
    { schema: listAuditLogsSchema },
    async (request) => {
      return AuditLogService.list(
        fastify,
        request.params.projectId,
        request.query
      );
    }
  );

  // Get a single audit log
  fastify.get<{
    Params: { projectId: string; auditLogId: string };
  }>(
    "/v1/projects/:projectId/audit-logs/:auditLogId",
    { schema: getAuditLogSchema },
    async (request) => {
      return AuditLogService.getById(
        fastify,
        request.params.projectId,
        request.params.auditLogId
      );
    }
  );

  // Get audit logs for a specific entity
  fastify.get<{
    Params: { projectId: string };
    Querystring: { entityType: string; entityId: string; limit?: number };
  }>(
    "/v1/projects/:projectId/audit-logs/entity",
    { schema: getEntityAuditLogsSchema },
    async (request) => {
      return AuditLogService.getByEntity(
        fastify,
        request.params.projectId,
        request.query.entityType,
        request.query.entityId,
        request.query.limit
      );
    }
  );
}
