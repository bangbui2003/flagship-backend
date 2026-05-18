import { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { SdkConfigService } from "../sdk-config/service.js";

interface EventInput {
  flagId: string;
  variationId: string;
  userKey: string;
  timestamp?: string;
  data?: Record<string, unknown>;
}

export class EventService {
  static async ingest(
    fastify: FastifyInstance,
    apiKey: string,
    data: EventInput,
  ) {
    const environment = await SdkConfigService.resolveEnvironment(
      fastify,
      apiKey,
    );

    const event = await fastify.db.event.create({
      data: {
        environment: { connect: { id: environment.id } },
        flag: { connect: { id: data.flagId } },
        flagVariation: { connect: { id: data.variationId } },
        userKey: data.userKey,
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
        data: (data.data || {}) as Prisma.InputJsonValue,
      },
    });

    return { ...event, id: event.id.toString() };
  }

  // Phase 1: direct insert. Move to Redis Streams → worker in Phase 2.
  static async ingestBatch(
    fastify: FastifyInstance,
    apiKey: string,
    events: EventInput[],
  ) {
    const environment = await SdkConfigService.resolveEnvironment(
      fastify,
      apiKey,
    );

    const result = await fastify.db.event.createMany({
      data: events.map((e) => ({
        environmentId: environment.id,
        flagId: e.flagId,
        variationId: e.variationId,
        userKey: e.userKey,
        timestamp: e.timestamp ? new Date(e.timestamp) : new Date(),
        data: (e.data || {}) as Prisma.InputJsonValue,
      })),
    });

    return { inserted: result.count };
  }

  static async query(
    fastify: FastifyInstance,
    filters: {
      environmentId?: string;
      flagId?: string;
      userKey?: string;
      from?: string;
      to?: string;
      cursor?: string;
      limit?: number;
    },
  ) {
    const limit = filters.limit || 50;

    const where: any = {};

    if (filters.environmentId) where.environmentId = filters.environmentId;
    if (filters.flagId) where.flagId = filters.flagId;
    if (filters.userKey) where.userKey = filters.userKey;

    if (filters.from || filters.to) {
      where.timestamp = {};
      if (filters.from) where.timestamp.gte = new Date(filters.from);
      if (filters.to) where.timestamp.lte = new Date(filters.to);
    }

    const events = await fastify.db.event.findMany({
      where,
      take: limit + 1, // Fetch one extra to determine if there are more
      orderBy: { id: "desc" },
      ...(filters.cursor
        ? {
            cursor: { id: BigInt(filters.cursor) },
            skip: 1, // Skip the cursor itself
          }
        : {}),
    });

    const hasMore = events.length > limit;
    const data = hasMore ? events.slice(0, limit) : events;

    return {
      data: data.map((e) => ({ ...e, id: e.id.toString() })),
      nextCursor: hasMore ? data[data.length - 1].id.toString() : null,
    };
  }
}
