const flagResponseProperties = {
  id: { type: "string", format: "uuid" },
  key: { type: "string" },
  name: { type: "string" },
  description: { type: "string", nullable: true },
  projectId: { type: "string", format: "uuid" },
  archived: { type: "boolean" },
  createdAt: { type: "string", format: "date-time" },
  updatedAt: { type: "string", format: "date-time" },
};

export const createFlagSchema = {
  body: {
    type: "object",
    required: ["name"],
    properties: {
      key: { type: "string", minLength: 1, maxLength: 100 },
      name: { type: "string", minLength: 1, maxLength: 100 },
      description: { type: "string" },
      archived: { type: "boolean" },
    },
    additionalProperties: false,
  },
  response: {
    201: {
      type: "object",
      properties: flagResponseProperties,
    },
  },
};

export const updateFlagSchema = {
  body: {
    type: "object",
    properties: {
      name: { type: "string", minLength: 1, maxLength: 100 },
      description: { type: "string" },
      archived: { type: "boolean" },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      type: "object",
      properties: flagResponseProperties,
    },
  },
};

export const getFlagsSchema = {
  querystring: {
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
        properties: flagResponseProperties,
      },
    },
  },
};

export const deleteFlagSchema = {
  response: {
    204: {
      type: "null",
    },
  },
};
