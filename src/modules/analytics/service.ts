import { FastifyInstance } from "fastify";

export interface AnalyticsQuery {
  startDate?: string;
  endDate?: string;
  flagId?: string;
  environmentId?: string;
  granularity?: "hour" | "day" | "week";
}

export interface FlagEvaluationStats {
  flagId: string;
  flagKey: string;
  flagName: string;
  totalEvaluations: number;
  uniqueUsers: number;
  variations: {
    variationId: string;
    variationKey: string;
    count: number;
    percentage: number;
  }[];
}

export interface TimeSeriesData {
  timestamp: string;
  evaluations: number;
  uniqueUsers: number;
}

export class AnalyticsService {
  static async getOverview(
    fastify: FastifyInstance,
    projectId: string,
    query: AnalyticsQuery
  ) {
    const { startDate, endDate, environmentId } = query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const environments = await fastify.db.environment.findMany({
      where: { projectId },
      select: { id: true },
    });

    const envIds = environmentId
      ? [environmentId]
      : environments.map((e) => e.id);

    const totalEvaluations = await fastify.db.event.count({
      where: {
        environmentId: { in: envIds },
        timestamp: { gte: start, lte: end },
      },
    });

    const uniqueUsersResult = await fastify.db.event.groupBy({
      by: ["userKey"],
      where: {
        environmentId: { in: envIds },
        timestamp: { gte: start, lte: end },
      },
    });
    const uniqueUsers = uniqueUsersResult.length;

    const flagsCount = await fastify.db.flag.count({
      where: { projectId, archived: false },
    });

    const activeFlagsResult = await fastify.db.event.groupBy({
      by: ["flagId"],
      where: {
        environmentId: { in: envIds },
        timestamp: { gte: start, lte: end },
      },
    });
    const activeFlags = activeFlagsResult.length;

    return {
      totalEvaluations,
      uniqueUsers,
      totalFlags: flagsCount,
      activeFlags,
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    };
  }

  static async getFlagStats(
    fastify: FastifyInstance,
    projectId: string,
    query: AnalyticsQuery
  ): Promise<FlagEvaluationStats[]> {
    const { startDate, endDate, environmentId, flagId } = query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const environments = await fastify.db.environment.findMany({
      where: { projectId },
      select: { id: true },
    });

    const envIds = environmentId
      ? [environmentId]
      : environments.map((e) => e.id);

    const flags = await fastify.db.flag.findMany({
      where: {
        projectId,
        archived: false,
        ...(flagId ? { id: flagId } : {}),
      },
      include: {
        flagVariations: true,
      },
    });

    const stats: FlagEvaluationStats[] = [];

    for (const flag of flags) {
      const totalEvaluations = await fastify.db.event.count({
        where: {
          flagId: flag.id,
          environmentId: { in: envIds },
          timestamp: { gte: start, lte: end },
        },
      });

      const uniqueUsersResult = await fastify.db.event.groupBy({
        by: ["userKey"],
        where: {
          flagId: flag.id,
          environmentId: { in: envIds },
          timestamp: { gte: start, lte: end },
        },
      });
      const uniqueUsers = uniqueUsersResult.length;

      const variationCounts = await fastify.db.event.groupBy({
        by: ["variationId"],
        where: {
          flagId: flag.id,
          environmentId: { in: envIds },
          timestamp: { gte: start, lte: end },
        },
        _count: { variationId: true },
      });

      const variations = flag.flagVariations.map((variation) => {
        const countData = variationCounts.find((vc) => vc.variationId === variation.id);
        const count = countData?._count?.variationId || 0;
        return {
          variationId: variation.id,
          variationKey: variation.key,
          count,
          percentage: totalEvaluations > 0 ? (count / totalEvaluations) * 100 : 0,
        };
      });

      stats.push({
        flagId: flag.id,
        flagKey: flag.key,
        flagName: flag.name,
        totalEvaluations,
        uniqueUsers,
        variations,
      });
    }

    stats.sort((a, b) => b.totalEvaluations - a.totalEvaluations);

    return stats;
  }

  static async getTimeSeries(
    fastify: FastifyInstance,
    projectId: string,
    query: AnalyticsQuery
  ): Promise<TimeSeriesData[]> {
    const { startDate, endDate, environmentId, flagId, granularity = "day" } = query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const environments = await fastify.db.environment.findMany({
      where: { projectId },
      select: { id: true },
    });

    const envIds = environmentId
      ? [environmentId]
      : environments.map((e) => e.id);

    const events = await fastify.db.event.findMany({
      where: {
        environmentId: { in: envIds },
        timestamp: { gte: start, lte: end },
        ...(flagId ? { flagId } : {}),
      },
      select: {
        timestamp: true,
        userKey: true,
      },
      orderBy: { timestamp: "asc" },
    });

    const buckets = new Map<string, { evaluations: number; users: Set<string> }>();

    for (const event of events) {
      const bucketKey = AnalyticsService.getBucketKey(event.timestamp, granularity);
      
      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, { evaluations: 0, users: new Set() });
      }

      const bucket = buckets.get(bucketKey)!;
      bucket.evaluations++;
      bucket.users.add(event.userKey);
    }

    const timeSeries: TimeSeriesData[] = [];
    const current = new Date(start);
    while (current <= end) {
      const bucketKey = AnalyticsService.getBucketKey(current, granularity);
      const bucket = buckets.get(bucketKey);

      timeSeries.push({
        timestamp: bucketKey,
        evaluations: bucket?.evaluations || 0,
        uniqueUsers: bucket?.users.size || 0,
      });

      switch (granularity) {
        case "hour":
          current.setHours(current.getHours() + 1);
          break;
        case "day":
          current.setDate(current.getDate() + 1);
          break;
        case "week":
          current.setDate(current.getDate() + 7);
          break;
      }
    }

    return timeSeries;
  }

  static async getTopUsers(
    fastify: FastifyInstance,
    projectId: string,
    query: AnalyticsQuery & { limit?: number }
  ) {
    const { startDate, endDate, environmentId, limit = 10 } = query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const environments = await fastify.db.environment.findMany({
      where: { projectId },
      select: { id: true },
    });

    const envIds = environmentId
      ? [environmentId]
      : environments.map((e) => e.id);

    const topUsers = await fastify.db.event.groupBy({
      by: ["userKey"],
      where: {
        environmentId: { in: envIds },
        timestamp: { gte: start, lte: end },
      },
      _count: { userKey: true },
      orderBy: { _count: { userKey: "desc" } },
      take: Number(limit),
    });

    return topUsers.map((u) => ({
      userKey: u.userKey,
      evaluations: u._count.userKey,
    }));
  }

  private static getBucketKey(date: Date, granularity: "hour" | "day" | "week"): string {
    const d = new Date(date);
    
    switch (granularity) {
      case "hour":
        d.setMinutes(0, 0, 0);
        return d.toISOString();
      case "day":
        d.setHours(0, 0, 0, 0);
        return d.toISOString().split("T")[0];
      case "week":
        const day = d.getDay();
        d.setDate(d.getDate() - day);
        d.setHours(0, 0, 0, 0);
        return d.toISOString().split("T")[0];
    }
  }
}
