import { FastifyInstance } from "fastify";
import {
  createFlagVersionSchema,
  toggleFlagVersionSchema,
  getFlagVersionsSchema,
  getFlagVersionByIdSchema,
} from "./schema.js";
import { FlagVersionService } from "./service.js";
import { WebhookService } from "../webhooks/service.js";

export default async function flagVersionRoutes(fastify: FastifyInstance) {
  // List versions for a flag (optionally filtered by environmentId)
  fastify.get(
    "/",
    { schema: getFlagVersionsSchema },
    async (request, reply) => {
      const { flagId, environmentId } = request.params as { flagId: string; environmentId: string };
      const versions = await FlagVersionService.getAll(
        fastify,
        flagId,
        environmentId,
      );
      return reply.send(versions);
    },
  );

  // Get latest version for a flag in an environment
  fastify.get(
    "/latest",
    async (request, reply) => {
      const { flagId, environmentId } = request.params as { flagId: string; environmentId: string };
      const version = await FlagVersionService.getLatest(fastify, flagId, environmentId);
      return reply.send(version);
    },
  );

  // Get flag version with targeting rules
  fastify.get(
    "/:id",
    { schema: getFlagVersionByIdSchema },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const version = await FlagVersionService.getById(fastify, id);
      return reply.send(version);
    },
  );

  // Create a new flag version
  fastify.post(
    "/",
    { schema: createFlagVersionSchema },
    async (request, reply) => {
      const { flagId, environmentId } = request.params as { flagId: string; environmentId: string };
      const version = await FlagVersionService.create(
        fastify,
        flagId,
        { ...request.body as object, environmentId },
      );
      return reply.code(201).send(version);
    },
  );

  // Toggle isEnabled
  fastify.patch(
    "/:id/toggle",
    { schema: toggleFlagVersionSchema },
    async (request, reply) => {
      const { projectId, flagId } = request.params as { projectId: string; flagId: string };
      const { id } = request.params as { id: string };
      const { isEnabled } = request.body as { isEnabled: boolean };
      const version = await FlagVersionService.toggle(
        fastify,
        id,
        isEnabled,
      );
      WebhookService.deliver(fastify, projectId, "flag.toggled", {
        flagId,
        versionId: id,
        isEnabled,
      }).catch(() => {});
      return reply.send(version);
    },
  );

  // Recompile the flag version
  fastify.post("/:id/compile", async (request, reply) => {
    const { id } = request.params as { id: string };
    const compiled = await FlagVersionService.compile(fastify, id);
    return reply.send(compiled);
  });
}
