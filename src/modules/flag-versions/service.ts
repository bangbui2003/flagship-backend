import { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { createHttpError } from "../../core/http/error-handler.js";
import { SdkConfigService } from "../sdk-config/service.js";

/**
 * The compiled JSONB shape consumed by SDKs for local evaluation.
 * This is the core artifact that powers the flag evaluation engine on the client side.
 */
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

    // If no version exists, return null (frontend will handle creating one)
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

  /**
   * Create a new flag version. Auto-increments the version number
   * for the given (flagId, environmentId) pair.
   */
  static async create(
    fastify: FastifyInstance,
    flagId: string,
    data: any,
  ) {
    const { environmentId, isEnabled = false } = data;

    // Get the latest version number for this flag+environment
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

  /**
   * Toggle the isEnabled state of this flag version and recompile.
   */
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

    // Recompile and publish
    await FlagVersionService.compile(fastify, id);

    return updated;
  }

  /**
   * Build the compiled JSONB from flag data + variations + targeting rules.
   * This compiled payload is what SDKs consume for local evaluation.
   */
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

    // Get all variations for this flag
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

    // Update the compiled field in the database
    await fastify.db.flagVersion.update({
      where: { id },
      data: { compiled: compiled as unknown as Prisma.InputJsonValue },
    });

    // Invalidate cache and notify SSE clients
    await SdkConfigService.invalidateAndNotify(
      fastify,
      flagVersion.environmentId,
      flagVersion.flag.key,
      "updated"
    );

    return compiled;
  }
}
