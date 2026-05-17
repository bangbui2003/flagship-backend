import { FastifyPluginAsync } from "fastify";

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  // Basic health check
  fastify.get("/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  // Detailed health check with dependencies
  fastify.get("/health/ready", async () => {
    const checks: Record<string, { status: string; latency?: number }> = {};

    // Check database
    const dbStart = Date.now();
    try {
      await fastify.db.$queryRaw`SELECT 1`;
      checks.database = { status: "ok", latency: Date.now() - dbStart };
    } catch {
      checks.database = { status: "error", latency: Date.now() - dbStart };
    }

    // Check Redis
    const redisStart = Date.now();
    try {
      await fastify.redis.ping();
      checks.redis = { status: "ok", latency: Date.now() - redisStart };
    } catch {
      checks.redis = { status: "error", latency: Date.now() - redisStart };
    }

    const allHealthy = Object.values(checks).every((c) => c.status === "ok");

    return {
      status: allHealthy ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      checks,
    };
  });

  // Liveness probe (for Kubernetes)
  fastify.get("/health/live", async () => {
    return { status: "ok" };
  });
};

export default healthRoutes;
