import "dotenv/config";
import { EventProcessor } from "./event-processor.js";
import { ScheduleProcessor } from "./schedule-processor.js";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const databaseUrl = process.env.DATABASE_URL;

async function main() {
  console.log("[Worker] Starting Flagship Worker...");
  console.log(`[Worker] Redis URL: ${redisUrl}`);
  
  if (!databaseUrl) {
    console.error("[Worker] DATABASE_URL is not defined");
    process.exit(1);
  }

  const eventProcessor = new EventProcessor(redisUrl, databaseUrl);
  const scheduleProcessor = new ScheduleProcessor(redisUrl, databaseUrl);

  // Graceful shutdown
  const shutdown = async () => {
    console.log("[Worker] Shutting down...");
    await Promise.all([eventProcessor.stop(), scheduleProcessor.stop()]);
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Start all processors
  await Promise.all([eventProcessor.start(), scheduleProcessor.start()]);

  console.log("[Worker] All processors started successfully");
}

main().catch((err) => {
  console.error("[Worker] Fatal error:", err);
  process.exit(1);
});
