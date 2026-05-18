import { FastifyInstance } from "fastify";
import { createHttpError } from "../../core/http/error-handler.js";

interface CompiledFlagConfig {
  key: string;
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

interface EnvironmentConfig {
  environment: string;
  environmentId: string;
  projectId: string;
  version: number;
  flags: Record<string, CompiledFlagConfig>;
  generatedAt: string;
}

// Cache TTL in seconds (5 minutes)
const CACHE_TTL = 300;

export class SdkConfigService {
  private static getCacheKey(environmentId: string): string {
    return `sdk:config:${environmentId}`;
  }

  static async resolveEnvironment(fastify: FastifyInstance, apiKey: string) {
    const environment = await fastify.db.environment.findUnique({
      where: { apiKey },
      select: {
        id: true,
        key: true,
        name: true,
        projectId: true,
      },
    });

    if (!environment) {
      throw createHttpError(401, "Invalid API key", {
        detail: "No environment found for the provided API key",
      });
    }

    return environment;
  }

  static async getConfig(fastify: FastifyInstance, apiKey: string): Promise<EnvironmentConfig> {
    const environment = await SdkConfigService.resolveEnvironment(
      fastify,
      apiKey,
    );

    const cacheKey = SdkConfigService.getCacheKey(environment.id);

    try {
      const cached = await fastify.redis.get(cacheKey);
      if (cached) {
        fastify.log.debug(`Cache hit for ${cacheKey}`);
        return JSON.parse(cached);
      }
    } catch (err) {
      fastify.log.warn(err, "Redis cache read failed, falling back to DB");
    }

    const config = await SdkConfigService.buildConfig(fastify, environment);

    try {
      await fastify.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(config));
    } catch (err) {
      fastify.log.warn(err, "Redis cache write failed");
    }

    return config;
  }

  private static async buildConfig(
    fastify: FastifyInstance,
    environment: { id: string; key: string; projectId: string }
  ): Promise<EnvironmentConfig> {
    const flags = await fastify.db.flag.findMany({
      where: {
        projectId: environment.projectId,
        archived: false,
      },
      select: {
        id: true,
        key: true,
      },
    });

    const flagConfigs: Record<string, CompiledFlagConfig> = {};
    let maxVersion = 0;

    for (const flag of flags) {
      const latestVersion = await fastify.db.flagVersion.findFirst({
        where: {
          flagId: flag.id,
          environmentId: environment.id,
        },
        orderBy: { version: "desc" },
        select: {
          compiled: true,
          isEnabled: true,
          version: true,
        },
      });

      if (latestVersion && latestVersion.compiled) {
        const compiled = latestVersion.compiled as any;
        flagConfigs[flag.key] = {
          key: flag.key,
          enabled: latestVersion.isEnabled,
          version: latestVersion.version,
          variations: compiled.variations || [],
          rules: compiled.rules || [],
        };
        maxVersion = Math.max(maxVersion, latestVersion.version);
      }
    }

    return {
      environment: environment.key,
      environmentId: environment.id,
      projectId: environment.projectId,
      version: maxVersion,
      flags: flagConfigs,
      generatedAt: new Date().toISOString(),
    };
  }

  static async invalidateAndNotify(
    fastify: FastifyInstance,
    environmentId: string,
    flagKey: string,
    action: "created" | "updated" | "deleted" | "toggled"
  ): Promise<void> {
    const cacheKey = SdkConfigService.getCacheKey(environmentId);

    try {
      await fastify.redis.del(cacheKey);
    } catch (err) {
      fastify.log.warn(err, "Failed to invalidate cache");
    }

    const channel = `flag-updates:${environmentId}`;
    const message = JSON.stringify({
      type: `flag.${action}`,
      flagKey,
      environmentId,
      timestamp: new Date().toISOString(),
    });

    try {
      await fastify.redis.publish(channel, message);
    } catch (err) {
      fastify.log.warn(err, "Failed to publish flag update");
    }
  }

  static async rebuildCache(
    fastify: FastifyInstance,
    environmentId: string
  ): Promise<void> {
    const environment = await fastify.db.environment.findUnique({
      where: { id: environmentId },
      select: {
        id: true,
        key: true,
        projectId: true,
      },
    });

    if (!environment) {
      fastify.log.warn(`Environment ${environmentId} not found for cache rebuild`);
      return;
    }

    const config = await SdkConfigService.buildConfig(fastify, environment);
    const cacheKey = SdkConfigService.getCacheKey(environmentId);

    try {
      await fastify.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(config));
    } catch (err) {
      fastify.log.warn(err, "Failed to rebuild cache");
    }
  }

  static async getSingleFlagConfig(
    fastify: FastifyInstance,
    apiKey: string,
    flagKey: string,
  ) {
    const environment = await SdkConfigService.resolveEnvironment(
      fastify,
      apiKey,
    );

    const flag = await fastify.db.flag.findUnique({
      where: {
        projectId_key: {
          projectId: environment.projectId,
          key: flagKey,
        },
      },
    });

    if (!flag) {
      throw createHttpError(404, "Flag not found", {
        detail: `No flag found with key '${flagKey}'`,
      });
    }

    const latestVersion = await fastify.db.flagVersion.findFirst({
      where: {
        flagId: flag.id,
        environmentId: environment.id,
      },
      orderBy: { version: "desc" },
      select: {
        compiled: true,
        isEnabled: true,
        version: true,
      },
    });

    if (!latestVersion) {
      return {
        key: flagKey,
        enabled: false,
        version: 0,
        variations: [],
        rules: [],
      };
    }

    const compiled = latestVersion.compiled as any;
    return {
      key: flagKey,
      enabled: latestVersion.isEnabled,
      version: latestVersion.version,
      variations: compiled.variations || [],
      rules: compiled.rules || [],
    };
  }
}
