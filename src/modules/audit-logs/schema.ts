// ============ Common Schemas ============
const auditLogResponseProperties = {
  id: { type: "string", format: "uuid" },
  projectId: { type: "string", format: "uuid" },
  environmentId: { type: "string", format: "uuid", nullable: true },
  entityType: { type: "string" },
  entityId: { type: "string", format: "uuid", nullable: true },
  action: { type: "string" },
  actor: { type: "string" },
  diff: {},
  createdAt: { type: "string", format: "date-time" },
};

// ============ Audit Log Schemas ============
export const listAuditLogsSchema = {
  params: {
    type: "object",
    required: ["projectId"],
    properties: {
      projectId: { type: "string", format: "uuid" },
    },
  },
  querystring: {
    type: "object",
    properties: {
      limit: { type: "number", minimum: 1, maximum: 100, default: 50 },
      offset: { type: "number", minimum: 0, default: 0 },
      entityType: { type: "string" },
      entityId: { type: "string", format: "uuid" },
      environmentId: { type: "string", format: "uuid" },
      action: { type: "string" },
      actor: { type: "string" },
      startDate: { type: "string", format: "date-time" },
      endDate: { type: "string", format: "date-time" },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        data: {
          type: "array",
          items: {
            type: "object",
            properties: auditLogResponseProperties,
          },
        },
        total: { type: "number" },
        limit: { type: "number" },
        offset: { type: "number" },
      },
    },
  },
};

export const getAuditLogSchema = {
  params: {
    type: "object",
    required: ["projectId", "auditLogId"],
    properties: {
      projectId: { type: "string", format: "uuid" },
      auditLogId: { type: "string", format: "uuid" },
    },
  },
  response: {
    200: {
      type: "object",
      properties: auditLogResponseProperties,
    },
  },
};

export const getEntityAuditLogsSchema = {
  params: {
    type: "object",
    required: ["projectId"],
    properties: {
      projectId: { type: "string", format: "uuid" },
    },
  },
  querystring: {
    type: "object",
    required: ["entityType", "entityId"],
    properties: {
      entityType: { type: "string" },
      entityId: { type: "string", format: "uuid" },
      limit: { type: "number", minimum: 1, maximum: 100, default: 50 },
    },
  },
  response: {
    200: {
      type: "array",
      items: {
        type: "object",
        properties: auditLogResponseProperties,
      },
    },
  },
};

// ============ Type Definitions ============
export interface AuditLogQuerystring {
  limit?: number;
  offset?: number;
  entityType?: string;
  entityId?: string;
  environmentId?: string;
  action?: string;
  actor?: string;
  startDate?: string;
  endDate?: string;
}

export interface CreateAuditLogInput {
  projectId: string;
  environmentId?: string;
  entityType: string;
  entityId?: string;
  action: string;
  actor: string;
  diff: any;
}

// ============ Entity Types ============
export const EntityTypes = {
  PROJECT: "project",
  ENVIRONMENT: "environment",
  FLAG: "flag",
  FLAG_VERSION: "flag_version",
  VARIATION: "variation",
  TARGETING_RULE: "targeting_rule",
  SEGMENT: "segment",
} as const;

// ============ Action Types ============
export const ActionTypes = {
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
  ENABLE: "enable",
  DISABLE: "disable",
  ARCHIVE: "archive",
  RESTORE: "restore",
} as const;
