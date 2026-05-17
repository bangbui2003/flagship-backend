import { FastifyInstance } from "fastify";
import {
  createVariationSchema,
  updateVariationSchema,
  getVariationsSchema,
} from "./schema.js";
import { FlagVariationService } from "./service.js";

export default async function flagVariationRoutes(fastify: FastifyInstance) {
  // List variations for a flag
  fastify.get(
    "/",
    { schema: getVariationsSchema },
    async (request, reply) => {
      const { flagId } = request.params as { flagId: string };
      const variations = await FlagVariationService.getAll(fastify, flagId);
      return reply.send(variations);
    },
  );

  // Create variation
  fastify.post(
    "/",
    { schema: createVariationSchema },
    async (request, reply) => {
      const { flagId } = request.params as { flagId: string };
      const variation = await FlagVariationService.create(
        fastify,
        flagId,
        request.body,
      );
      return reply.code(201).send(variation);
    },
  );

  // Update variation
  fastify.put(
    "/:id",
    { schema: updateVariationSchema },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const variation = await FlagVariationService.update(
        fastify,
        id,
        request.body,
      );
      return reply.send(variation);
    },
  );

  // Delete variation
  fastify.delete("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    await FlagVariationService.delete(fastify, id);
    return reply.code(204).send();
  });
}
