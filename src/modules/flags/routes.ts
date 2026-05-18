import { FastifyInstance } from "fastify";
import { createFlagSchema, updateFlagSchema } from "./schema.js";
import { FlagService } from "./service.js";
import { WebhookService } from "../webhooks/service.js";

export default async function flagRoutes(fastify: FastifyInstance) {
  fastify.get("/", async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const flags = await FlagService.getAll(fastify, projectId);
    return reply.send(flags);
  });

  fastify.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const flag = await FlagService.getById(fastify, id);
    return reply.send(flag);
  });

  fastify.post("/", { schema: createFlagSchema }, async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const flag = await FlagService.create(fastify, { ...request.body as object, projectId });
    WebhookService.deliver(fastify, projectId, "flag.created", { flag }).catch(() => {});
    return reply.code(201).send(flag);
  });

  fastify.patch("/:id", { schema: updateFlagSchema }, async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const { id } = request.params as { id: string };
    const flag = await FlagService.update(fastify, id, request.body);
    WebhookService.deliver(fastify, projectId, "flag.updated", { flag }).catch(() => {});
    return reply.send(flag);
  });

  fastify.delete("/:id", async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const { id } = request.params as { id: string };
    await FlagService.delete(fastify, id);
    WebhookService.deliver(fastify, projectId, "flag.deleted", { flagId: id }).catch(() => {});
    return reply.code(204).send();
  });
}
