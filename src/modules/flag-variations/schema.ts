const variationResponseProperties = {
  id: { type: "string", format: "uuid" },
  flagId: { type: "string", format: "uuid" },
  key: { type: "string" },
  value: {},
  createdAt: { type: "string", format: "date-time" },
};

export const createVariationSchema = {
  body: {
    type: "object",
    required: ["key", "value"],
    properties: {
      key: { type: "string", minLength: 1, maxLength: 50 },
      value: {},
    },
    additionalProperties: false,
  },
  response: {
    201: {
      type: "object",
      properties: variationResponseProperties,
    },
  },
};

export const updateVariationSchema = {
  body: {
    type: "object",
    properties: {
      key: { type: "string", minLength: 1, maxLength: 50 },
      value: {},
    },
    additionalProperties: false,
  },
  response: {
    200: {
      type: "object",
      properties: variationResponseProperties,
    },
  },
};

export const getVariationsSchema = {
  response: {
    200: {
      type: "array",
      items: {
        type: "object",
        properties: variationResponseProperties,
      },
    },
  },
};
