import { FastifyInstance } from "fastify";
import {
  createProjectSchema,
  updateProjectSchema,
  getProjectsSchema,
  getProjectByIdSchema,
} from "./schema.js";
import { ProjectService } from "./service.js";

export default async function projectRoutes(fastify: FastifyInstance) {
  // List all projects
  fastify.get("/", { schema: getProjectsSchema }, async (request, reply) => {
    const projects = await ProjectService.getAll(fastify);
    return reply.send(projects);
  });

  // Get project by ID
  fastify.get(
    "/:id",
    { schema: getProjectByIdSchema },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const project = await ProjectService.getById(fastify, id);
      return reply.send(project);
    },
  );

  // Create project
  fastify.post(
    "/",
    { schema: createProjectSchema },
    async (request, reply) => {
      const project = await ProjectService.create(fastify, request.body);
      return reply.code(201).send(project);
    },
  );

  // Update project
  fastify.put(
    "/:id",
    { schema: updateProjectSchema },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const project = await ProjectService.update(fastify, id, request.body);
      return reply.send(project);
    },
  );

  // Delete project
  fastify.delete("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    await ProjectService.delete(fastify, id);
    return reply.code(204).send();
  });
}
