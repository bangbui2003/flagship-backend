import { createRequire } from "module";
import { FastifyInstance } from "fastify";
import { getConfigSchema, getSingleConfigSchema } from "./schema.js";
import { SdkConfigService } from "./service.js";

const require = createRequire(import.meta.url);
const Redis = require("ioredis");

export default async function sdkConfigRoutes(fastify: FastifyInstance) {
  // GET /v1/sdk/config — Get all compiled flags for the environment
  fastify.get(
    "/config",
    { schema: getConfigSchema },
    async (request, reply) => {
      const apiKey = request.headers["x-api-key"] as string;
      const config = await SdkConfigService.getConfig(fastify, apiKey);
      return reply.send(config);
    },
  );

  // GET /v1/sdk/config/:flagKey — Get compiled config for a single flag
  fastify.get(
    "/config/:flagKey",
    { schema: getSingleConfigSchema },
    async (request, reply) => {
      const apiKey = request.headers["x-api-key"] as string;
      const { flagKey } = request.params as { flagKey: string };
      const config = await SdkConfigService.getSingleFlagConfig(
        fastify,
        apiKey,
        flagKey,
      );
      return reply.send(config);
    },
  );

  // GET /v1/sdk/stream — SSE endpoint for real-time flag updates
  fastify.get("/stream", async (request, reply) => {
    const apiKey = request.headers["x-api-key"] as string;

    if (!apiKey) {
      return reply.code(401).send({ error: "API key is required" });
    }

    // Resolve environment to validate API key
    const environment = await SdkConfigService.resolveEnvironment(
      fastify,
      apiKey,
    );

    const channel = `flag-updates:${environment.id}`;

    // Set SSE headers
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    // Send initial connection event
    reply.raw.write(
      `data: ${JSON.stringify({ type: "connected", environmentId: environment.id })}\n\n`,
    );

    // Create a dedicated Redis subscriber for this SSE connection
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    const subscriber = new Redis(redisUrl);

    subscriber.subscribe(channel, (err: Error | null) => {
      if (err) {
        fastify.log.error(err, `Failed to subscribe to channel ${channel}`);
        reply.raw.end();
        return;
      }
      fastify.log.info(`SSE client subscribed to ${channel}`);
    });

    subscriber.on("message", (_channel: string, message: string) => {
      reply.raw.write(`data: ${message}\n\n`);
    });

    // Keep-alive ping every 30 seconds
    const keepAlive = setInterval(() => {
      reply.raw.write(": ping\n\n");
    }, 30000);

    // Cleanup on disconnect
    request.raw.on("close", () => {
      clearInterval(keepAlive);
      subscriber.unsubscribe(channel);
      subscriber.quit();
      fastify.log.info(`SSE client disconnected from ${channel}`);
    });
  });

  // POST /v1/sdk/events — Batch ingest events from SDK
  fastify.post("/events", async (request, reply) => {
    const apiKey = request.headers["x-api-key"] as string;

    if (!apiKey) {
      return reply.code(401).send({ error: "API key is required" });
    }

    const environment = await SdkConfigService.resolveEnvironment(
      fastify,
      apiKey,
    );

    const { events } = request.body as { events: unknown[] };

    if (!Array.isArray(events) || events.length === 0) {
      return reply.code(400).send({ error: "Events array is required" });
    }

    // Store events in Redis for async processing
    const pipeline = fastify.redis.pipeline();
    for (const event of events) {
      pipeline.lpush(
        `events:${environment.id}`,
        JSON.stringify({
          ...(event as object),
          environmentId: environment.id,
          receivedAt: new Date().toISOString(),
        })
      );
    }
    await pipeline.exec();

    fastify.log.info(`Received ${events.length} events for environment ${environment.id}`);

    return reply.code(202).send({ 
      accepted: events.length,
      message: "Events queued for processing" 
    });
  });
}
