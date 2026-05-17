import fp from "fastify-plugin";
import { type FastifyPluginAsync } from "fastify";
import { ProblemDetails } from "./errors.js";

// Small helper to create typed HTTP errors in handlers/services
export function createHttpError(
  status: number,
  message: string,
  extras?: Record<string, unknown>,
) {
  const err: any = new Error(message);
  err.statusCode = status;
  if (extras) Object.assign(err, extras);
  return err;
}

// Core error handling plugin that formats all errors according to the ProblemDetails structure
const errorHandler: FastifyPluginAsync = async (fastify) => {
  fastify.setErrorHandler((error, request, reply) => {
    const status = (error as any).statusCode || (error as any).status || 500;

    const responsePayload: ProblemDetails = {
      type: (error as any).type || "about:blank",
      title:
        (error as any).message || (status >= 500 ? "Internal Server Error" : "Error"),
      status,
      detail: (error as any).detail || undefined,
      instance: request.url,
      timestamp: new Date().toISOString(),
    };

    // Attach validation or domain errors when available
    if ((error as any).validation) {
      responsePayload.errors = (error as any).validation;
    } else if ((error as any).errors) {
      responsePayload.errors = (error as any).errors;
    }

    // Log server errors with stack for debugging
    if (status >= 500) {
      fastify.log.error("Error when handling request: " + error);
    } else {
      fastify.log.warn("Handled error: " + error);
    }

    reply.status(status).send(responsePayload);
  });
};

export default fp(errorHandler, { name: "core-error-handler" });
