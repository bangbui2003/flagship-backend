import { createRequire } from "module";
import type { Redis as RedisType } from "ioredis";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const require = createRequire(import.meta.url);
const Redis = require("ioredis");

const BATCH_SIZE = 100;
const PROCESS_INTERVAL = 5000; // 5 seconds

interface QueuedEvent {
  type: "flag_evaluation" | "feature_exposure" | "error_log";
  flagKey: string;
  variationKey: string;
  userKey: string;
  reason?: string;
  timestamp: number;
  environmentId: string;
  receivedAt: string;
}

export class EventProcessor {
  private redis: RedisType;
  private db: PrismaClient;
  private running = false;
  private processTimer: ReturnType<typeof setInterval> | null = null;
  
  constructor(redisUrl: string, databaseUrl: string) {
    this.redis = new Redis(redisUrl);
    
    // Use PostgreSQL adapter like the main backend
    const adapter = new PrismaPg({
      connectionString: databaseUrl,
    });
    
    this.db = new PrismaClient({ adapter });
  }

  async start(): Promise<void> {
    console.log("[EventProcessor] Starting event processor...");
    this.running = true;

    // Process events periodically
    this.processTimer = setInterval(() => {
      this.processAllEnvironments().catch((err) => {
        console.error("[EventProcessor] Error processing events:", err);
      });
    }, PROCESS_INTERVAL);

    // Initial processing
    await this.processAllEnvironments();
  }

  async stop(): Promise<void> {
    console.log("[EventProcessor] Stopping event processor...");
    this.running = false;

    if (this.processTimer) {
      clearInterval(this.processTimer);
      this.processTimer = null;
    }

    await this.redis.quit();
    await this.db.$disconnect();
  }

  private async processAllEnvironments(): Promise<void> {
    if (!this.running) return;

    // Get all environment event queues
    const keys = await this.redis.keys("events:*");

    for (const key of keys) {
      const environmentId = key.replace("events:", "");
      await this.processEnvironmentEvents(environmentId);
    }
  }

  private async processEnvironmentEvents(environmentId: string): Promise<void> {
    const queueKey = `events:${environmentId}`;

    // Get batch of events from queue
    const rawEvents = await this.redis.lrange(queueKey, -BATCH_SIZE, -1);

    if (rawEvents.length === 0) return;

    console.log(
      `[EventProcessor] Processing ${rawEvents.length} events for environment ${environmentId}`
    );

    const events: QueuedEvent[] = [];
    const aggregates = new Map<string, number>();

    // Parse and aggregate events
    for (const raw of rawEvents) {
      try {
        const event = JSON.parse(raw) as QueuedEvent;
        events.push(event);

        // Build aggregate key
        const date = new Date(event.timestamp).toISOString().split("T")[0];
        const aggKey = `${environmentId}:${event.flagKey}:${event.variationKey}:${date}`;
        aggregates.set(aggKey, (aggregates.get(aggKey) || 0) + 1);
      } catch (err) {
        console.error("[EventProcessor] Failed to parse event:", raw, err);
      }
    }

    // Update aggregates in database
    await this.updateAggregates(aggregates);

    // Remove processed events from queue
    await this.redis.ltrim(queueKey, 0, -(rawEvents.length + 1));

    console.log(
      `[EventProcessor] Processed ${events.length} events, updated ${aggregates.size} aggregates`
    );
  }

  private async updateAggregates(
    aggregates: Map<string, number>
  ): Promise<void> {
    for (const [key, count] of aggregates) {
      const [environmentId, flagKey, variationKey, date] = key.split(":");

      try {
        // Upsert aggregate record
        await this.db.$executeRaw`
          INSERT INTO flag_analytics (environment_id, flag_key, variation_key, date, evaluation_count)
          VALUES (${environmentId}::uuid, ${flagKey}, ${variationKey}, ${date}::date, ${count})
          ON CONFLICT (environment_id, flag_key, variation_key, date)
          DO UPDATE SET 
            evaluation_count = flag_analytics.evaluation_count + ${count},
            updated_at = NOW()
        `;
      } catch (err) {
        console.error(
          `[EventProcessor] Failed to update aggregate for ${key}:`,
          err
        );
      }
    }
  }
}

// Run as standalone process
if (process.argv[1]?.endsWith("event-processor.ts") || process.argv[1]?.endsWith("event-processor.js")) {
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error("[EventProcessor] DATABASE_URL is not defined");
    process.exit(1);
  }
  
  const processor = new EventProcessor(redisUrl, databaseUrl);

  process.on("SIGINT", async () => {
    await processor.stop();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await processor.stop();
    process.exit(0);
  });

  processor.start().catch((err) => {
    console.error("[EventProcessor] Failed to start:", err);
    process.exit(1);
  });
}

export default EventProcessor;
