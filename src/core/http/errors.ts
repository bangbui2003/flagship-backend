// Shared error types and JSON schema for HTTP error responses
// This obeys the RFC 7807 "Problem Details for HTTP APIs" standard, with some extensions for validation errors and timestamps.
export interface ProblemDetails {
  type?: string; // a URI reference that identifies the problem type
  title: string; // short, human-readable summary of the problem type
  status: number; // HTTP status code
  detail?: string; // human-readable explanation specific to this occurrence
  instance?: string; // URI reference that identifies the specific occurrence
  errors?: Record<string, unknown> | unknown[]; // optional validation/errors map
  timestamp?: string; // ISO timestamp when the error occurred
}

const ProblemDetailsSchema = {
  type: "object",
  properties: {
    type: { type: "string" },
    title: { type: "string" },
    status: { type: "integer" },
    detail: { type: "string" },
    instance: { type: "string" },
    errors: { type: ["object", "array", "null"] },
    timestamp: { type: "string", format: "date-time" },
  },
  required: ["title", "status"],
  additionalProperties: false,
} as const;

export default ProblemDetailsSchema;
