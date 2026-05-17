// ============ Common Schemas ============
const segmentResponseProperties = {
  id: { type: "string", format: "uuid" },
  projectId: { type: "string", format: "uuid" },
  key: { type: "string" },
  name: { type: "string" },
  description: { type: "string", nullable: true },
  rules: { type: "array", items: { type: "object" }, nullable: true },
  userCount: { type: "number" },
  createdAt: { type: "string", format: "date-time" },
  updatedAt: { type: "string", format: "date-time" },
};

// ============ Segment Schemas ============
export const listSegmentsSchema = {
  params: {
    type: "object",
    required: ["projectId"],
    properties: {
      projectId: { type: "string", format: "uuid" },
    },
  },
  response: {
    200: {
      type: "array",
      items: {
        type: "object",
        properties: segmentResponseProperties,
      },
    },
  },
};

export const getSegmentSchema = {
  params: {
    type: "object",
    required: ["projectId", "segmentId"],
    properties: {
      projectId: { type: "string", format: "uuid" },
      segmentId: { type: "string", format: "uuid" },
    },
  },
  response: {
    200: {
      type: "object",
      properties: segmentResponseProperties,
    },
  },
};

export const createSegmentSchema = {
  params: {
    type: "object",
    required: ["projectId"],
    properties: {
      projectId: { type: "string", format: "uuid" },
    },
  },
  body: {
    type: "object",
    required: ["key", "name"],
    properties: {
      key: { type: "string", minLength: 1, maxLength: 100 },
      name: { type: "string", minLength: 1, maxLength: 255 },
      description: { type: "string", maxLength: 1000 },
    },
    additionalProperties: false,
  },
  response: {
    201: {
      type: "object",
      properties: segmentResponseProperties,
    },
  },
};

export const updateSegmentSchema = {
  params: {
    type: "object",
    required: ["projectId", "segmentId"],
    properties: {
      projectId: { type: "string", format: "uuid" },
      segmentId: { type: "string", format: "uuid" },
    },
  },
  body: {
    type: "object",
    properties: {
      key: { type: "string", minLength: 1, maxLength: 100 },
      name: { type: "string", minLength: 1, maxLength: 255 },
      description: { type: "string", maxLength: 1000 },
      rules: { type: "array", items: { type: "object" } },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      type: "object",
      properties: segmentResponseProperties,
    },
  },
};

export const deleteSegmentSchema = {
  params: {
    type: "object",
    required: ["projectId", "segmentId"],
    properties: {
      projectId: { type: "string", format: "uuid" },
      segmentId: { type: "string", format: "uuid" },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        success: { type: "boolean" },
      },
    },
  },
};

// ============ Segment Users Schemas ============
export const getSegmentUsersSchema = {
  params: {
    type: "object",
    required: ["projectId", "segmentId"],
    properties: {
      projectId: { type: "string", format: "uuid" },
      segmentId: { type: "string", format: "uuid" },
    },
  },
  querystring: {
    type: "object",
    properties: {
      limit: { type: "number", minimum: 1, maximum: 1000, default: 100 },
      offset: { type: "number", minimum: 0, default: 0 },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        segmentId: { type: "string", format: "uuid" },
        users: {
          type: "array",
          items: {
            type: "object",
            properties: {
              userKey: { type: "string" },
              attributes: { type: "object", additionalProperties: true },
            },
          },
        },
        total: { type: "number" },
      },
    },
  },
};

export const addSegmentUsersSchema = {
  params: {
    type: "object",
    required: ["projectId", "segmentId"],
    properties: {
      projectId: { type: "string", format: "uuid" },
      segmentId: { type: "string", format: "uuid" },
    },
  },
  body: {
    type: "object",
    required: ["userKeys"],
    properties: {
      userKeys: {
        type: "array",
        items: { type: "string", minLength: 1 },
        minItems: 1,
        maxItems: 1000,
      },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      type: "object",
      properties: {
        segmentId: { type: "string", format: "uuid" },
        added: { type: "number" },
        total: { type: "number" },
      },
    },
  },
};

export const removeSegmentUsersSchema = {
  params: {
    type: "object",
    required: ["projectId", "segmentId"],
    properties: {
      projectId: { type: "string", format: "uuid" },
      segmentId: { type: "string", format: "uuid" },
    },
  },
  body: {
    type: "object",
    required: ["userKeys"],
    properties: {
      userKeys: {
        type: "array",
        items: { type: "string", minLength: 1 },
        minItems: 1,
        maxItems: 1000,
      },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      type: "object",
      properties: {
        segmentId: { type: "string", format: "uuid" },
        removed: { type: "number" },
        total: { type: "number" },
      },
    },
  },
};

export const checkSegmentUserSchema = {
  params: {
    type: "object",
    required: ["projectId", "segmentId", "userKey"],
    properties: {
      projectId: { type: "string", format: "uuid" },
      segmentId: { type: "string", format: "uuid" },
      userKey: { type: "string" },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        segmentId: { type: "string", format: "uuid" },
        userKey: { type: "string" },
        isMember: { type: "boolean" },
      },
    },
  },
};

// ============ Type Definitions ============
export interface CreateSegmentBody {
  key: string;
  name: string;
  description?: string;
}

export interface SegmentRule {
  id: string;
  attribute: string;
  operator: string;
  value: string;
}

export interface UpdateSegmentBody {
  key?: string;
  name?: string;
  description?: string;
  rules?: SegmentRule[];
}

export interface AddUsersBody {
  userKeys: string[];
}

export interface RemoveUsersBody {
  userKeys: string[];
}
