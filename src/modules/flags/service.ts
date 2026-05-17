import { FastifyInstance } from "fastify";
import { createHttpError } from "../../core/http/error-handler.js";

export class FlagService {
  /**
   * Auto-generate a URL-safe key from the name if not provided.
   */
  private static slugify(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  static async getAll(fastify: FastifyInstance, projectId?: string) {
    if (!projectId) {
      throw createHttpError(400, "Project ID is required");
    }

    return await fastify.db.flag.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });
  }

  static async getById(fastify: FastifyInstance, id: string) {
    const flag = await fastify.db.flag.findUnique({
      where: { id },
      include: {
        flagVariations: true,
      },
    });

    if (!flag) {
      throw createHttpError(404, "Flag not found", {
        detail: `No flag found with ID '${id}'`,
      });
    }

    return flag;
  }

  static async create(fastify: FastifyInstance, data: any) {
    const { name, description, archived, projectId } = data;
    let { key } = data;

    if (!projectId) {
      throw createHttpError(400, "Project ID is required");
    }

    // Auto-generate key from name if not provided
    if (!key) {
      key = FlagService.slugify(name);
    }

    // Check for duplicate key within the project
    const existingFlag = await fastify.db.flag.findUnique({
      where: {
        projectId_key: { projectId, key },
      },
    });

    if (existingFlag) {
      throw createHttpError(409, "Flag with this key already exists", {
        detail: `Flag key '${key}' already exists in this project`,
      });
    }

    return await fastify.db.flag.create({
      data: {
        key,
        name,
        description,
        archived: archived || false,
        project: { connect: { id: projectId } },
      },
    });
  }

  static async update(fastify: FastifyInstance, id: string, data: any) {
    await FlagService.getById(fastify, id);

    const { name, description, archived } = data;

    return await fastify.db.flag.update({
      where: { id },
      data: { name, description, archived },
    });
  }

  static async delete(fastify: FastifyInstance, id: string) {
    await FlagService.getById(fastify, id);

    return await fastify.db.flag.delete({
      where: { id },
    });
  }
}
