const environmentResponseProperties = {
  id: { type: "string", format: "uuid" },
  projectId: { type: "string", format: "uuid" },
  key: { type: "string" },
  name: { type: "string" },
  color: { type: "string", nullable: true },
  apiKey: { type: "string" },
  createdAt: { type: "string", format: "date-time" },
  updatedAt: { type: "string", format: "date-time" },
};

export const createEnvironmentSchema = {
  body: {
    type: "object",
    required: ["key", "name"],
    properties: {
      key: { type: "string", minLength: 1, maxLength: 50 },
      name: { type: "string", minLength: 1, maxLength: 100 },
      color: { type: "string", maxLength: 7 },
    },
    additionalProperties: false,
  },
  response: {
    201: {
      type: "object",
      properties: environmentResponseProperties,
    },
  },
};

export const updateEnvironmentSchema = {
  body: {
    type: "object",
    properties: {
      name: { type: "string", minLength: 1, maxLength: 100 },
      color: { type: "string", maxLength: 7 },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      type: "object",
      properties: environmentResponseProperties,
    },
  },
};

export const getEnvironmentsSchema = {
  response: {
    200: {
      type: "array",
      items: {
        type: "object",
        properties: environmentResponseProperties,
      },
    },
  },
};

export const getEnvironmentByIdSchema = {
  params: {
    type: "object",
    required: ["projectId", "id"],
    properties: {
      projectId: { type: "string", format: "uuid" },
      id: { type: "string", format: "uuid" },
    },
  },
  response: {
    200: {
      type: "object",
      properties: environmentResponseProperties,
    },
  },
};
