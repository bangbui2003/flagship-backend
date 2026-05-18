const userResponseProperties = {
  id: { type: "string", format: "uuid" },
  email: { type: "string", format: "email" },
  name: { type: "string" },
  role: { type: "string" },
};

const errorResponse = {
  type: "object",
  properties: {
    error: { type: "string" },
  },
};

export const registerSchema = {
  body: {
    type: "object",
    required: ["email", "name", "password"],
    properties: {
      email: { type: "string", format: "email" },
      name: { type: "string", minLength: 1, maxLength: 255 },
      password: { type: "string", minLength: 8, maxLength: 128 },
    },
    additionalProperties: false,
  },
  response: {
    201: {
      type: "object",
      properties: userResponseProperties,
    },
  },
};

export const loginSchema = {
  body: {
    type: "object",
    required: ["email", "password"],
    properties: {
      email: { type: "string", format: "email" },
      password: { type: "string" },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      type: "object",
      properties: {
        user: {
          type: "object",
          properties: userResponseProperties,
        },
        token: { type: "string" },
        expiresAt: { type: "string", format: "date-time" },
      },
    },
  },
};

export const meSchema = {
  response: {
    200: {
      type: "object",
      properties: {
        user: {
          type: "object",
          properties: userResponseProperties,
        },
      },
    },
    401: errorResponse,
  },
};

export const listUsersSchema = {
  response: {
    200: {
      type: "array",
      items: {
        type: "object",
        properties: userResponseProperties,
      },
    },
    401: errorResponse,
    403: errorResponse,
  },
};

export const updateRoleSchema = {
  params: {
    type: "object",
    required: ["userId"],
    properties: {
      userId: { type: "string", format: "uuid" },
    },
  },
  body: {
    type: "object",
    required: ["role"],
    properties: {
      role: {
        type: "string",
        enum: ["admin", "developer", "product_manager", "qa", "analyst"],
      },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      type: "object",
      properties: userResponseProperties,
    },
    401: errorResponse,
    403: errorResponse,
  },
};
