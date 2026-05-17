const targetingRuleProperties = {
  id: { type: "string", format: "uuid" },
  orderIndex: { type: "integer" },
  condition: {},
  rollout: {},
  createdAt: { type: "string", format: "date-time" },
};

const flagVersionResponseProperties = {
  id: { type: "string", format: "uuid" },
  flagId: { type: "string", format: "uuid" },
  environmentId: { type: "string", format: "uuid" },
  version: { type: "integer" },
  isEnabled: { type: "boolean" },
  compiled: {},
  createdAt: { type: "string", format: "date-time" },
};

const flagVersionWithRulesProperties = {
  ...flagVersionResponseProperties,
  targetingRules: {
    type: "array",
    items: {
      type: "object",
      properties: targetingRuleProperties,
    },
  },
};

export const createFlagVersionSchema = {
  body: {
    type: "object",
    properties: {
      isEnabled: { type: "boolean" },
    },
    additionalProperties: false,
  },
  response: {
    201: {
      type: "object",
      properties: flagVersionResponseProperties,
    },
  },
};

export const toggleFlagVersionSchema = {
  body: {
    type: "object",
    required: ["isEnabled"],
    properties: {
      isEnabled: { type: "boolean" },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      type: "object",
      properties: flagVersionResponseProperties,
    },
  },
};

export const getFlagVersionsSchema = {
  querystring: {
    type: "object",
    properties: {
      environmentId: { type: "string", format: "uuid" },
    },
  },
  response: {
    200: {
      type: "array",
      items: {
        type: "object",
        properties: flagVersionResponseProperties,
      },
    },
  },
};

export const getFlagVersionByIdSchema = {
  response: {
    200: {
      type: "object",
      properties: flagVersionWithRulesProperties,
    },
  },
};
