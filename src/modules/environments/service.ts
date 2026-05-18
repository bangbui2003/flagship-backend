import { randomUUID } from "node:crypto";
import { FastifyInstance } from "fastify";
import { createHttpError } from "../../core/http/error-handler.js";

export class EnvironmentService {
  private static generateApiKey(): string {
    return `fls_${randomUUID().replace(/-/g, "")}`;
  }

  static async getAll(fastify: FastifyInstance, projectId: string) {
    return await fastify.db.environment.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
    });
  }

  static async getById(fastify: FastifyInstance, id: string) {
    const environment = await fastify.db.environment.findUnique({
      where: { id },
    });

    if (!environment) {
      throw createHttpError(404, "Environment not found", {
        detail: `No environment found with ID '${id}'`,
      });
    }

    return environment;
  }

  static async create(
    fastify: FastifyInstance,
    projectId: string,
    data: any,
  ) {
    const { key, name, color } = data;

    const existing = await fastify.db.environment.findUnique({
      where: {
        projectId_key: { projectId, key },
      },
    });

    if (existing) {
      throw createHttpError(409, "Environment key already exists", {
        detail: `Environment key '${key}' already exists in this project`,
      });
    }

    const apiKey = EnvironmentService.generateApiKey();

    return await fastify.db.environment.create({
      data: {
        key,
        name,
        color,
        apiKey,
        project: { connect: { id: projectId } },
      },
    });
  }

  static async update(fastify: FastifyInstance, id: string, data: any) {
    await EnvironmentService.getById(fastify, id);

    const { name, color } = data;

    return await fastify.db.environment.update({
      where: { id },
      data: { name, color },
    });
  }

  static async delete(fastify: FastifyInstance, id: string) {
    await EnvironmentService.getById(fastify, id);

    return await fastify.db.environment.delete({
      where: { id },
    });
  }

  static async rotateApiKey(fastify: FastifyInstance, id: string) {
    await EnvironmentService.getById(fastify, id);

    const newApiKey = EnvironmentService.generateApiKey();

    return await fastify.db.environment.update({
      where: { id },
      data: { apiKey: newApiKey },
    });
  }
}
