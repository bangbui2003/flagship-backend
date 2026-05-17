import { FastifyInstance } from "fastify";
import {
  createEnvironmentSchema,
  updateEnvironmentSchema,
  getEnvironmentsSchema,
  getEnvironmentByIdSchema,
} from "./schema.js";
import { EnvironmentService } from "./service.js";

export default async function environmentRoutes(fastify: FastifyInstance) {
  // List environments for a project
  fastify.get(
    "/",
    { schema: getEnvironmentsSchema },
    async (request, reply) => {
      const { projectId } = request.params as { projectId: string };
      const environments = await EnvironmentService.getAll(fastify, projectId);
      return reply.send(environments);
    },
  );

  // Get environment by ID
  fastify.get(
    "/:id",
    { schema: getEnvironmentByIdSchema },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const environment = await EnvironmentService.getById(fastify, id);
      return reply.send(environment);
    },
  );

  // Create environment
  fastify.post(
    "/",
    { schema: createEnvironmentSchema },
    async (request, reply) => {
      const { projectId } = request.params as { projectId: string };
      const environment = await EnvironmentService.create(
        fastify,
        projectId,
        request.body,
      );
      return reply.code(201).send(environment);
    },
  );

  // Update environment
  fastify.put(
    "/:id",
    { schema: updateEnvironmentSchema },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const environment = await EnvironmentService.update(
        fastify,
        id,
        request.body,
      );
      return reply.send(environment);
    },
  );

  // Delete environment
  fastify.delete("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    await EnvironmentService.delete(fastify, id);
    return reply.code(204).send();
  });

  // Rotate API key
  fastify.post("/:id/rotate-key", async (request, reply) => {
    const { id } = request.params as { id: string };
    const environment = await EnvironmentService.rotateApiKey(fastify, id);
    return reply.send(environment);
  });
}
