import { createRequire } from "module";
import fp from "fastify-plugin";
import type { Redis as RedisType } from "ioredis";

const require = createRequire(import.meta.url);
const Redis = require("ioredis");

declare module "fastify" {
  interface FastifyInstance {
    redis: RedisType;
  }
}

export default fp(async (fastify) => {
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

  const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times: number) {
      const delay = Math.min(times * 200, 2000);
      return delay;
    },
  });

  redis.on("connect", () => {
    fastify.log.info("Redis connection established");
  });

  redis.on("error", (err: Error) => {
    fastify.log.error(err, "Redis connection error");
  });

  fastify.decorate("redis", redis);

  fastify.addHook("onClose", async () => {
    fastify.log.info("Disconnecting from Redis...");
    await redis.quit();
  });
});
