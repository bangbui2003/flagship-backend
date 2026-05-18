import { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { createHttpError } from "../../core/http/error-handler.js";
import { SdkConfigService } from "../sdk-config/service.js";

interface CompiledFlag {
  flagKey: string;
  enabled: boolean;
  version: number;
  variations: Array<{
    id: string;
    key: string;
    value: unknown;
  }>;
  rules: Array<{
    orderIndex: number;
    condition: unknown;
    rollout: unknown;
  }>;
}

export class FlagVersionService {
  static async getAll(
    fastify: FastifyInstance,
    flagId: string,
    environmentId?: string,
  ) {
    return await fastify.db.flagVersion.findMany({
      where: {
        flagId,
        ...(environmentId ? { environmentId } : {}),
      },
      orderBy: { version: "desc" },
    });
  }

  static async getLatest(
    fastify: FastifyInstance,
    flagId: string,
    environmentId: string,
  ) {
    const flagVersion = await fastify.db.flagVersion.findFirst({
      where: { flagId, environmentId },
      orderBy: { version: "desc" },
      include: {
        targetingRules: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    return flagVersion;
  }

  static async getById(fastify: FastifyInstance, id: string) {
    const flagVersion = await fastify.db.flagVersion.findUnique({
      where: { id },
      include: {
        targetingRules: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!flagVersion) {
      throw createHttpError(404, "Flag version not found", {
        detail: `No flag version found with ID '${id}'`,
      });
    }

    return flagVersion;
  }

  static async create(
    fastify: FastifyInstance,
    flagId: string,
    data: any,
  ) {
    const { environmentId, isEnabled = false } = data;

    const latestVersion = await fastify.db.flagVersion.findFirst({
      where: { flagId, environmentId },
      orderBy: { version: "desc" },
      select: { version: true },
    });

    const nextVersion = (latestVersion?.version ?? 0) + 1;

    const flagVersion = await fastify.db.flagVersion.create({
      data: {
        flag: { connect: { id: flagId } },
        environment: { connect: { id: environmentId } },
        version: nextVersion,
        isEnabled,
        compiled: {},
      },
    });

    return flagVersion;
  }

  static async toggle(
    fastify: FastifyInstance,
    id: string,
    isEnabled: boolean,
  ) {
    await FlagVersionService.getById(fastify, id);

    const updated = await fastify.db.flagVersion.update({
      where: { id },
      data: { isEnabled },
    });

    await FlagVersionService.compile(fastify, id);

    return updated;
  }

  static async compile(fastify: FastifyInstance, id: string) {
    const flagVersion = await fastify.db.flagVersion.findUnique({
      where: { id },
      include: {
        flag: true,
        targetingRules: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!flagVersion) {
      throw createHttpError(404, "Flag version not found");
    }

    const variations = await fastify.db.flagVariation.findMany({
      where: { flagId: flagVersion.flagId },
      orderBy: { createdAt: "asc" },
    });

    const compiled: CompiledFlag = {
      flagKey: flagVersion.flag.key,
      enabled: flagVersion.isEnabled,
      version: flagVersion.version,
      variations: variations.map((v) => ({
        id: v.id,
        key: v.key,
        value: v.value,
      })),
      rules: flagVersion.targetingRules.map((r) => ({
        orderIndex: r.orderIndex,
        condition: r.condition,
        rollout: r.rollout,
      })),
    };

    await fastify.db.flagVersion.update({
      where: { id },
      data: { compiled: compiled as unknown as Prisma.InputJsonValue },
    });

    await SdkConfigService.invalidateAndNotify(
      fastify,
      flagVersion.environmentId,
      flagVersion.flag.key,
      "updated"
    );

    return compiled;
  }
}
