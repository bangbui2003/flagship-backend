const projectResponseProperties = {
  id: { type: "string", format: "uuid" },
  name: { type: "string" },
  description: { type: "string", nullable: true },
  createdAt: { type: "string", format: "date-time" },
  updatedAt: { type: "string", format: "date-time" },
};

export const createProjectSchema = {
  body: {
    type: "object",
    required: ["name"],
    properties: {
      name: { type: "string", minLength: 1, maxLength: 100 },
      description: { type: "string" },
    },
    additionalProperties: false,
  },
  response: {
    201: {
      type: "object",
      properties: projectResponseProperties,
    },
  },
};

export const updateProjectSchema = {
  body: {
    type: "object",
    properties: {
      name: { type: "string", minLength: 1, maxLength: 100 },
      description: { type: "string" },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      type: "object",
      properties: projectResponseProperties,
    },
  },
};

export const getProjectsSchema = {
  response: {
    200: {
      type: "array",
      items: {
        type: "object",
        properties: projectResponseProperties,
      },
    },
  },
};

export const getProjectByIdSchema = {
  params: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string", format: "uuid" },
    },
  },
  response: {
    200: {
      type: "object",
      properties: projectResponseProperties,
    },
  },
};
