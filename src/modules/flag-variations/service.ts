import { FastifyInstance } from "fastify";
import { createHttpError } from "../../core/http/error-handler.js";

export class FlagVariationService {
  static async getAll(fastify: FastifyInstance, flagId: string) {
    return await fastify.db.flagVariation.findMany({
      where: { flagId },
      orderBy: { createdAt: "asc" },
    });
  }

  static async getById(fastify: FastifyInstance, id: string) {
    const variation = await fastify.db.flagVariation.findUnique({
      where: { id },
    });

    if (!variation) {
      throw createHttpError(404, "Variation not found", {
        detail: `No flag variation found with ID '${id}'`,
      });
    }

    return variation;
  }

  static async create(
    fastify: FastifyInstance,
    flagId: string,
    data: any,
  ) {
    const { key, value } = data;

    // Check unique key within the flag
    const existing = await fastify.db.flagVariation.findUnique({
      where: {
        flagId_key: { flagId, key },
      },
    });

    if (existing) {
      throw createHttpError(409, "Variation key already exists", {
        detail: `Variation key '${key}' already exists for this flag`,
      });
    }

    return await fastify.db.flagVariation.create({
      data: {
        key,
        value,
        flag: { connect: { id: flagId } },
      },
    });
  }

  static async update(fastify: FastifyInstance, id: string, data: any) {
    const existing = await FlagVariationService.getById(fastify, id);

    const { key, value } = data;

    // If changing key, check uniqueness
    if (key && key !== existing.key) {
      const duplicate = await fastify.db.flagVariation.findUnique({
        where: {
          flagId_key: { flagId: existing.flagId, key },
        },
      });

      if (duplicate) {
        throw createHttpError(409, "Variation key already exists", {
          detail: `Variation key '${key}' already exists for this flag`,
        });
      }
    }

    return await fastify.db.flagVariation.update({
      where: { id },
      data: { key, value },
    });
  }

  static async delete(fastify: FastifyInstance, id: string) {
    await FlagVariationService.getById(fastify, id);

    return await fastify.db.flagVariation.delete({
      where: { id },
    });
  }
}
