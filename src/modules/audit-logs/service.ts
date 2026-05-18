import { FastifyInstance } from "fastify";
import { createHttpError } from "../../core/http/error-handler.js";
import type { AuditLogQuerystring, CreateAuditLogInput } from "./schema.js";

export class AuditLogService {
  static async list(
    fastify: FastifyInstance,
    projectId: string,
    query: AuditLogQuerystring
  ) {
    const {
      limit = 50,
      offset = 0,
      entityType,
      entityId,
      environmentId,
      action,
      actor,
      startDate,
      endDate,
    } = query;

    const where: any = { projectId };

    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (environmentId) where.environmentId = environmentId;
    if (action) where.action = action;
    if (actor) where.actor = { contains: actor, mode: "insensitive" };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      fastify.db.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      fastify.db.auditLog.count({ where }),
    ]);

    return {
      data: logs.map((log) => ({
        id: log.id,
        projectId: log.projectId,
        environmentId: log.environmentId,
        entityType: log.entityType,
        entityId: log.entityId,
        action: log.action,
        actor: log.actor,
        diff: log.diff,
        createdAt: log.createdAt.toISOString(),
      })),
      total,
      limit,
      offset,
    };
  }

  static async getById(
    fastify: FastifyInstance,
    projectId: string,
    auditLogId: string
  ) {
    const log = await fastify.db.auditLog.findFirst({
      where: { id: auditLogId, projectId },
    });

    if (!log) {
      throw createHttpError(404, "Audit log not found");
    }

    return {
      id: log.id,
      projectId: log.projectId,
      environmentId: log.environmentId,
      entityType: log.entityType,
      entityId: log.entityId,
      action: log.action,
      actor: log.actor,
      diff: log.diff,
      createdAt: log.createdAt.toISOString(),
    };
  }

  static async create(fastify: FastifyInstance, input: CreateAuditLogInput) {
    const log = await fastify.db.auditLog.create({
      data: {
        projectId: input.projectId,
        environmentId: input.environmentId,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        actor: input.actor,
        diff: input.diff,
      },
    });

    return {
      id: log.id,
      projectId: log.projectId,
      environmentId: log.environmentId,
      entityType: log.entityType,
      entityId: log.entityId,
      action: log.action,
      actor: log.actor,
      diff: log.diff,
      createdAt: log.createdAt.toISOString(),
    };
  }

  static async getByEntity(
    fastify: FastifyInstance,
    projectId: string,
    entityType: string,
    entityId: string,
    limit = 50
  ) {
    const logs = await fastify.db.auditLog.findMany({
      where: {
        projectId,
        entityType,
        entityId,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return logs.map((log) => ({
      id: log.id,
      projectId: log.projectId,
      environmentId: log.environmentId,
      entityType: log.entityType,
      entityId: log.entityId,
      action: log.action,
      actor: log.actor,
      diff: log.diff,
      createdAt: log.createdAt.toISOString(),
    }));
  }

  static computeDiff(oldValue: any, newValue: any): any {
    if (!oldValue) {
      return { type: "create", new: newValue };
    }

    if (!newValue) {
      return { type: "delete", old: oldValue };
    }

    const changes: Record<string, { old: any; new: any }> = {};

    // Get all keys from both objects
    const allKeys = new Set([
      ...Object.keys(oldValue),
      ...Object.keys(newValue),
    ]);

    for (const key of allKeys) {
      const oldVal = oldValue[key];
      const newVal = newValue[key];

      // Skip internal fields
      if (["createdAt", "updatedAt", "id"].includes(key)) continue;

      // Compare values
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes[key] = { old: oldVal, new: newVal };
      }
    }

    return { type: "update", changes };
  }
}

// ============ Audit Log Helper for other modules ============
export async function logAudit(
  fastify: FastifyInstance,
  input: CreateAuditLogInput
) {
  try {
    await AuditLogService.create(fastify, input);
  } catch (error) {
    // Log error but don't fail the main operation
    fastify.log.error({ error, input }, "Failed to create audit log");
  }
}
