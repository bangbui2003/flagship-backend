import { FastifyInstance } from "fastify";
import { WebhookService } from "./service.js";

export default async function webhookRoutes(fastify: FastifyInstance) {
  // List webhooks for a project
  fastify.get("/", async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const webhooks = await WebhookService.list(fastify, projectId);
    return reply.send(webhooks);
  });

  // Get a single webhook
  fastify.get("/:webhookId", async (request, reply) => {
    const { webhookId } = request.params as { webhookId: string };
    const webhook = await WebhookService.getById(fastify, webhookId);
    return reply.send(webhook);
  });

  // Create a webhook
  fastify.post("/", async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const webhook = await WebhookService.create(fastify, projectId, request.body);
    return reply.code(201).send(webhook);
  });

  // Update a webhook
  fastify.patch("/:webhookId", async (request, reply) => {
    const { webhookId } = request.params as { webhookId: string };
    const webhook = await WebhookService.update(fastify, webhookId, request.body);
    return reply.send(webhook);
  });

  // Delete a webhook
  fastify.delete("/:webhookId", async (request, reply) => {
    const { webhookId } = request.params as { webhookId: string };
    await WebhookService.delete(fastify, webhookId);
    return reply.code(204).send();
  });

  // Test a webhook
  fastify.post("/:webhookId/test", async (request, reply) => {
    const { webhookId } = request.params as { webhookId: string };
    const result = await WebhookService.test(fastify, webhookId);
    return reply.send(result);
  });
}
