export const getConfigSchema = {
  headers: {
    type: "object",
    required: ["x-api-key"],
    properties: {
      "x-api-key": { type: "string" },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        environment: { type: "string" },
        environmentId: { type: "string", format: "uuid" },
        flags: {
          type: "object",
          additionalProperties: {
            type: "object",
            properties: {
              key: { type: "string" },
              enabled: { type: "boolean" },
              version: { type: "integer" },
              variations: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string", format: "uuid" },
                    key: { type: "string" },
                    value: {},
                  },
                },
              },
              rules: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    orderIndex: { type: "integer" },
                    condition: {},
                    rollout: {},
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

export const getSingleConfigSchema = {
  headers: {
    type: "object",
    required: ["x-api-key"],
    properties: {
      "x-api-key": { type: "string" },
    },
  },
};
