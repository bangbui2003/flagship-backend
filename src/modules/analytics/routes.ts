import { FastifyInstance } from "fastify";
import { AnalyticsService, AnalyticsQuery } from "./service.js";

export default async function analyticsRoutes(fastify: FastifyInstance) {
  // Get overview stats
  fastify.get("/overview", async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const query = request.query as AnalyticsQuery;
    
    const overview = await AnalyticsService.getOverview(fastify, projectId, query);
    return reply.send(overview);
  });

  // Get flag stats
  fastify.get("/flags", async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const query = request.query as AnalyticsQuery;
    
    const stats = await AnalyticsService.getFlagStats(fastify, projectId, query);
    return reply.send(stats);
  });

  // Get time series data
  fastify.get("/timeseries", async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const query = request.query as AnalyticsQuery;
    
    const timeSeries = await AnalyticsService.getTimeSeries(fastify, projectId, query);
    return reply.send(timeSeries);
  });

  // Get top users
  fastify.get("/users", async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const query = request.query as AnalyticsQuery & { limit?: number };
    
    const topUsers = await AnalyticsService.getTopUsers(fastify, projectId, query);
    return reply.send(topUsers);
  });

  // Export analytics data as CSV
  fastify.get("/export", async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const query = request.query as AnalyticsQuery & { format?: string };
    
    const flagStats = await AnalyticsService.getFlagStats(fastify, projectId, query);
    const timeSeries = await AnalyticsService.getTimeSeries(fastify, projectId, query);
    
    const format = query.format || "csv";
    
    if (format === "json") {
      return reply.send({ flagStats, timeSeries });
    }
    
    // Generate CSV
    const csvLines = [
      "Flag Key,Flag Name,Total Evaluations,Unique Users",
      ...flagStats.map((f: any) => 
        `"${f.flagKey}","${f.flagName}",${f.totalEvaluations},${f.uniqueUsers}`
      ),
      "",
      "Timestamp,Evaluations,Unique Users",
      ...timeSeries.map((t: any) => 
        `"${t.timestamp}",${t.evaluations},${t.uniqueUsers}`
      ),
    ];
    
    const csv = csvLines.join("\n");
    
    reply.header("Content-Type", "text/csv");
    reply.header("Content-Disposition", `attachment; filename="analytics-${projectId}.csv"`);
    return reply.send(csv);
  });
}
