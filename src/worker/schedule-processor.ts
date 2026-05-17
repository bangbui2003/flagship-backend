import { createRequire } from "module";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type { Redis as RedisType } from "ioredis";

const require = createRequire(import.meta.url);
const Redis = require("ioredis");

const CHECK_INTERVAL = 10000; // 10 seconds

export class ScheduleProcessor {
  private db: PrismaClient;
  private redis: RedisType;
  private running = false;
  private checkTimer: ReturnType<typeof setInterval> | null = null;

  constructor(redisUrl: string, databaseUrl: string) {
    // Use PostgreSQL adapter like the main backend
    const adapter = new PrismaPg({
      connectionString: databaseUrl,
    });
    
    this.db = new PrismaClient({ adapter });
    this.redis = new Redis(redisUrl, {
      tls: redisUrl.startsWith("rediss://") ? {} : undefined,
      maxRetriesPerRequest: 3,
    });
  }

  async start(): Promise<void> {
    console.log("[ScheduleProcessor] Starting schedule processor...");
    this.running = true;

    // Check for due schedules periodically
    this.checkTimer = setInterval(() => {
      this.processDueSchedules().catch((err) => {
        console.error("[ScheduleProcessor] Error processing schedules:", err);
      });
    }, CHECK_INTERVAL);

    // Initial check
    await this.processDueSchedules();
  }

  async stop(): Promise<void> {
    console.log("[ScheduleProcessor] Stopping schedule processor...");
    this.running = false;

    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }

    await this.redis.quit();
    await this.db.$disconnect();
  }

  private async processDueSchedules(): Promise<void> {
    if (!this.running) return;

    const now = new Date();

    // Find all pending schedules that are due
    const dueSchedules = await this.db.flagSchedule.findMany({
      where: {
        status: "pending",
        scheduledAt: { lte: now },
      },
      orderBy: { scheduledAt: "asc" },
      take: 10, // Process in batches
    });

    if (dueSchedules.length === 0) return;

    console.log(
      `[ScheduleProcessor] Processing ${dueSchedules.length} due schedules`
    );

    for (const schedule of dueSchedules) {
      await this.executeSchedule(schedule);
    }
  }

  private async executeSchedule(schedule: {
    id: string;
    flagVersionId: string;
    action: string;
    payload: unknown;
  }): Promise<void> {
    try {
      console.log(
        `[ScheduleProcessor] Executing schedule ${schedule.id}: ${schedule.action}`
      );

      // Get the flag version
      const flagVersion = await this.db.flagVersion.findUnique({
        where: { id: schedule.flagVersionId },
        include: {
          flag: true,
          environment: true,
        },
      });

      if (!flagVersion) {
        console.warn(
          `[ScheduleProcessor] Flag version ${schedule.flagVersionId} not found, marking schedule as failed`
        );
        await this.db.flagSchedule.update({
          where: { id: schedule.id },
          data: { status: "failed", executedAt: new Date() },
        });
        return;
      }

      // Execute the action
      switch (schedule.action) {
        case "enable":
          await this.db.flagVersion.update({
            where: { id: schedule.flagVersionId },
            data: { isEnabled: true },
          });
          break;

        case "disable":
          await this.db.flagVersion.update({
            where: { id: schedule.flagVersionId },
            data: { isEnabled: false },
          });
          break;

        case "update_rollout":
          // Update rollout from payload
          const payload = schedule.payload as { rollout?: unknown };
          if (payload.rollout) {
            console.log(
              `[ScheduleProcessor] Rollout update not fully implemented`
            );
          }
          break;

        default:
          console.warn(
            `[ScheduleProcessor] Unknown action: ${schedule.action}`
          );
      }

      // Mark schedule as executed
      await this.db.flagSchedule.update({
        where: { id: schedule.id },
        data: { status: "executed", executedAt: new Date() },
      });

      // Invalidate cache and notify SSE clients
      const channel = `flag-updates:${flagVersion.environmentId}`;
      await this.redis.publish(
        channel,
        JSON.stringify({
          type: "flag.scheduled_update",
          flagKey: flagVersion.flag.key,
          action: schedule.action,
          environmentId: flagVersion.environmentId,
          timestamp: new Date().toISOString(),
        })
      );

      // Invalidate cache
      const cacheKey = `sdk:config:${flagVersion.environmentId}`;
      await this.redis.del(cacheKey);

      console.log(
        `[ScheduleProcessor] Schedule ${schedule.id} executed successfully`
      );

      // Create audit log
      await this.db.auditLog.create({
        data: {
          projectId: flagVersion.flag.projectId,
          environmentId: flagVersion.environmentId,
          entityType: "flag",
          entityId: flagVersion.flagId,
          action: `scheduled_${schedule.action}`,
          actor: "system:scheduler",
          diff: {
            scheduleId: schedule.id,
            action: schedule.action,
            executedAt: new Date().toISOString(),
          },
        },
      });
    } catch (err) {
      console.error(
        `[ScheduleProcessor] Failed to execute schedule ${schedule.id}:`,
        err
      );

      // Mark as failed
      await this.db.flagSchedule.update({
        where: { id: schedule.id },
        data: { status: "failed", executedAt: new Date() },
      });
    }
  }
}

// Run as standalone process
if (process.argv[1]?.endsWith("schedule-processor.ts") || process.argv[1]?.endsWith("schedule-processor.js")) {
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error("[ScheduleProcessor] DATABASE_URL is not defined");
    process.exit(1);
  }
  
  const processor = new ScheduleProcessor(redisUrl, databaseUrl);

  process.on("SIGINT", async () => {
    await processor.stop();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await processor.stop();
    process.exit(0);
  });

  processor.start().catch((err) => {
    console.error("[ScheduleProcessor] Failed to start:", err);
    process.exit(1);
  });
}

export default ScheduleProcessor;
