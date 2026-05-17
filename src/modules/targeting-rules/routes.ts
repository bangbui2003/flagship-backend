import { FastifyInstance } from "fastify";
import {
  createRuleSchema,
  updateRuleSchema,
  reorderRulesSchema,
  getRulesSchema,
} from "./schema.js";
import { TargetingRuleService } from "./service.js";

export default async function targetingRuleRoutes(fastify: FastifyInstance) {
  // List rules for a flag version (ordered by orderIndex)
  fastify.get("/", { schema: getRulesSchema }, async (request, reply) => {
    const { flagVersionId } = request.params as { flagVersionId: string };
    const rules = await TargetingRuleService.getAll(fastify, flagVersionId);
    return reply.send(rules);
  });

  // Create rule
  fastify.post(
    "/",
    { schema: createRuleSchema },
    async (request, reply) => {
      const { flagVersionId } = request.params as {
        flagVersionId: string;
      };
      const rule = await TargetingRuleService.create(
        fastify,
        flagVersionId,
        request.body,
      );
      return reply.code(201).send(rule);
    },
  );

  // Update rule
  fastify.put(
    "/:id",
    { schema: updateRuleSchema },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const rule = await TargetingRuleService.update(
        fastify,
        id,
        request.body,
      );
      return reply.send(rule);
    },
  );

  // Reorder all rules
  fastify.put(
    "/reorder",
    { schema: reorderRulesSchema },
    async (request, reply) => {
      const { flagVersionId } = request.params as {
        flagVersionId: string;
      };
      const { order } = request.body as {
        order: Array<{ id: string; orderIndex: number }>;
      };
      const rules = await TargetingRuleService.reorder(
        fastify,
        flagVersionId,
        order,
      );
      return reply.send(rules);
    },
  );

  // Delete rule
  fastify.delete("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    await TargetingRuleService.delete(fastify, id);
    return reply.code(204).send();
  });
}
