const eventResponseProperties = {
  id: { type: "string" },
  environmentId: { type: "string", format: "uuid" },
  flagId: { type: "string", format: "uuid" },
  variationId: { type: "string", format: "uuid" },
  userKey: { type: "string" },
  timestamp: { type: "string", format: "date-time" },
  data: {},
};

export const ingestEventSchema = {
  headers: {
    type: "object",
    required: ["x-api-key"],
    properties: {
      "x-api-key": { type: "string" },
    },
  },
  body: {
    type: "object",
    required: ["flagId", "variationId", "userKey"],
    properties: {
      flagId: { type: "string", format: "uuid" },
      variationId: { type: "string", format: "uuid" },
      userKey: { type: "string", minLength: 1 },
      timestamp: { type: "string", format: "date-time" },
      data: { type: "object" },
    },
    additionalProperties: false,
  },
  response: {
    201: {
      type: "object",
      properties: eventResponseProperties,
    },
  },
};

export const ingestBatchEventSchema = {
  headers: {
    type: "object",
    required: ["x-api-key"],
    properties: {
      "x-api-key": { type: "string" },
    },
  },
  body: {
    type: "object",
    required: ["events"],
    properties: {
      events: {
        type: "array",
        items: {
          type: "object",
          required: ["flagId", "variationId", "userKey"],
          properties: {
            flagId: { type: "string", format: "uuid" },
            variationId: { type: "string", format: "uuid" },
            userKey: { type: "string", minLength: 1 },
            timestamp: { type: "string", format: "date-time" },
            data: { type: "object" },
          },
          additionalProperties: false,
        },
        maxItems: 1000,
      },
    },
    additionalProperties: false,
  },
  response: {
    201: {
      type: "object",
      properties: {
        inserted: { type: "integer" },
      },
    },
  },
};

export const getEventsSchema = {
  querystring: {
    type: "object",
    properties: {
      environmentId: { type: "string", format: "uuid" },
      flagId: { type: "string", format: "uuid" },
      userKey: { type: "string" },
      from: { type: "string", format: "date-time" },
      to: { type: "string", format: "date-time" },
      cursor: { type: "string" },
      limit: { type: "integer", minimum: 1, maximum: 100, default: 50 },
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
            properties: eventResponseProperties,
          },
        },
        nextCursor: { type: "string", nullable: true },
      },
    },
  },
};
