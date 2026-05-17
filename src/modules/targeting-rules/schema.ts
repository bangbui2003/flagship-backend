const ruleResponseProperties = {
  id: { type: "string", format: "uuid" },
  flagVersionId: { type: "string", format: "uuid" },
  orderIndex: { type: "integer" },
  condition: {},
  rollout: {},
  createdAt: { type: "string", format: "date-time" },
};

export const createRuleSchema = {
  body: {
    type: "object",
    required: ["condition", "rollout"],
    properties: {
      orderIndex: { type: "integer", minimum: 0 },
      condition: {
        type: "object",
        properties: {
          attribute: { type: "string" },
          op: {
            type: "string",
            enum: [
              "eq",
              "neq",
              "in",
              "not_in",
              "contains",
              "starts_with",
              "ends_with",
              "gt",
              "gte",
              "lt",
              "lte",
              "regex",
              "segment",
            ],
          },
          values: { type: "array", items: {} },
        },
      },
      rollout: {
        type: "array",
        items: {
          type: "object",
          required: ["variationId", "weight"],
          properties: {
            variationId: { type: "string", format: "uuid" },
            weight: { type: "integer", minimum: 0, maximum: 100000 },
          },
        },
      },
    },
    additionalProperties: false,
  },
  response: {
    201: {
      type: "object",
      properties: ruleResponseProperties,
    },
  },
};

export const updateRuleSchema = {
  body: {
    type: "object",
    properties: {
      orderIndex: { type: "integer", minimum: 0 },
      condition: {},
      rollout: {
        type: "array",
        items: {
          type: "object",
          required: ["variationId", "weight"],
          properties: {
            variationId: { type: "string", format: "uuid" },
            weight: { type: "integer", minimum: 0, maximum: 100000 },
          },
        },
      },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      type: "object",
      properties: ruleResponseProperties,
    },
  },
};

export const reorderRulesSchema = {
  body: {
    type: "object",
    required: ["order"],
    properties: {
      order: {
        type: "array",
        items: {
          type: "object",
          required: ["id", "orderIndex"],
          properties: {
            id: { type: "string", format: "uuid" },
            orderIndex: { type: "integer", minimum: 0 },
          },
        },
      },
    },
    additionalProperties: false,
  },
};

export const getRulesSchema = {
  response: {
    200: {
      type: "array",
      items: {
        type: "object",
        properties: ruleResponseProperties,
      },
    },
  },
};
