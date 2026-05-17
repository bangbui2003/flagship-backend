import { FastifyInstance } from "fastify";
import { createHttpError } from "../../core/http/error-handler.js";

export class ProjectService {
  static async getAll(fastify: FastifyInstance) {
    return await fastify.db.project.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  static async getById(fastify: FastifyInstance, id: string) {
    const project = await fastify.db.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw createHttpError(404, "Project not found", {
        detail: `No project found with ID '${id}'`,
      });
    }

    return project;
  }

  static async create(fastify: FastifyInstance, data: any) {
    const { name, description } = data;

    const existing = await fastify.db.project.findUnique({
      where: { name },
    });

    if (existing) {
      throw createHttpError(409, "Project with this name already exists", {
        detail: `A project named '${name}' already exists`,
      });
    }

    return await fastify.db.project.create({
      data: { name, description },
    });
  }

  static async update(fastify: FastifyInstance, id: string, data: any) {
    const { name, description } = data;

    // Ensure project exists
    await ProjectService.getById(fastify, id);

    // Check name uniqueness if name is being changed
    if (name) {
      const existing = await fastify.db.project.findUnique({
        where: { name },
      });
      if (existing && existing.id !== id) {
        throw createHttpError(409, "Project with this name already exists");
      }
    }

    return await fastify.db.project.update({
      where: { id },
      data: { name, description },
    });
  }

  static async delete(fastify: FastifyInstance, id: string) {
    await ProjectService.getById(fastify, id);

    return await fastify.db.project.delete({
      where: { id },
    });
  }
}
