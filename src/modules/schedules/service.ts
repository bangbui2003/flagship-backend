import { FastifyInstance } from "fastify";
import { createHttpError } from "../../core/http/error-handler.js";

export interface CreateScheduleInput {
  flagVersionId: string;
  action: "enable" | "disable" | "update_rollout";
  scheduledAt: string;
  payload?: Record<string, unknown>;
}

export interface UpdateScheduleInput {
  action?: "enable" | "disable" | "update_rollout";
  scheduledAt?: string;
  status?: "pending" | "cancelled";
  payload?: Record<string, unknown>;
}

export class ScheduleService {
  static async list(
    fastify: FastifyInstance,
    projectId: string,
    options?: { status?: string; flagId?: string }
  ) {
    const flagVersions = await fastify.db.flagVersion.findMany({
      where: {
        flag: { projectId },
        ...(options?.flagId ? { flagId: options.flagId } : {}),
      },
      select: { id: true },
    });

    const flagVersionIds = flagVersions.map((fv) => fv.id);

    const schedules = await fastify.db.flagSchedule.findMany({
      where: {
        flagVersionId: { in: flagVersionIds },
        ...(options?.status ? { status: options.status } : {}),
      },
      orderBy: { scheduledAt: "asc" },
    });

    const enrichedSchedules = await Promise.all(
      schedules.map(async (schedule) => {
        const flagVersion = await fastify.db.flagVersion.findUnique({
          where: { id: schedule.flagVersionId },
          include: {
            flag: true,
            environment: true,
          },
        });

        return {
          ...schedule,
          flag: flagVersion?.flag,
          environment: flagVersion?.environment,
        };
      })
    );

    return enrichedSchedules;
  }

  static async getById(fastify: FastifyInstance, id: string) {
    const schedule = await fastify.db.flagSchedule.findUnique({
      where: { id },
    });

    if (!schedule) {
      throw createHttpError(404, "Schedule not found");
    }

    const flagVersion = await fastify.db.flagVersion.findUnique({
      where: { id: schedule.flagVersionId },
      include: {
        flag: true,
        environment: true,
      },
    });

    return {
      ...schedule,
      flag: flagVersion?.flag,
      environment: flagVersion?.environment,
    };
  }

  static async create(
    fastify: FastifyInstance,
    projectId: string,
    data: CreateScheduleInput
  ) {
    const { flagVersionId, action, scheduledAt, payload } = data;

    // Verify flag version exists and belongs to project
    const flagVersion = await fastify.db.flagVersion.findUnique({
      where: { id: flagVersionId },
      include: { flag: true },
    });

    if (!flagVersion || flagVersion.flag.projectId !== projectId) {
      throw createHttpError(404, "Flag version not found");
    }

    // Validate scheduled time is in the future
    const scheduledDate = new Date(scheduledAt);
    if (scheduledDate <= new Date()) {
      throw createHttpError(400, "Scheduled time must be in the future");
    }

    return await fastify.db.flagSchedule.create({
      data: {
        flagVersionId,
        action,
        scheduledAt: scheduledDate,
        payload: payload ? JSON.parse(JSON.stringify(payload)) : {},
        status: "pending",
      },
    });
  }

  static async update(
    fastify: FastifyInstance,
    id: string,
    data: UpdateScheduleInput
  ) {
    const schedule = await ScheduleService.getById(fastify, id);

    if (schedule.status !== "pending") {
      throw createHttpError(400, "Can only update pending schedules");
    }

    const updateData: Record<string, unknown> = {};

    if (data.scheduledAt) {
      const scheduledDate = new Date(data.scheduledAt);
      if (scheduledDate <= new Date()) {
        throw createHttpError(400, "Scheduled time must be in the future");
      }
      updateData.scheduledAt = scheduledDate;
    }

    if (data.action) {
      updateData.action = data.action;
    }

    if (data.status) {
      updateData.status = data.status;
    }

    if (data.payload) {
      updateData.payload = data.payload;
    }

    return await fastify.db.flagSchedule.update({
      where: { id },
      data: updateData,
    });
  }

  static async cancel(fastify: FastifyInstance, id: string) {
    const schedule = await ScheduleService.getById(fastify, id);

    if (schedule.status !== "pending") {
      throw createHttpError(400, "Can only cancel pending schedules");
    }

    return await fastify.db.flagSchedule.update({
      where: { id },
      data: { status: "cancelled" },
    });
  }

  static async delete(fastify: FastifyInstance, id: string) {
    await ScheduleService.getById(fastify, id);

    await fastify.db.flagSchedule.delete({
      where: { id },
    });
  }

  static async executePendingSchedules(fastify: FastifyInstance) {
    const now = new Date();

    const pendingSchedules = await fastify.db.flagSchedule.findMany({
      where: {
        status: "pending",
        scheduledAt: { lte: now },
      },
    });

    const results = [];

    for (const schedule of pendingSchedules) {
      try {
        const flagVersion = await fastify.db.flagVersion.findUnique({
          where: { id: schedule.flagVersionId },
        });

        if (!flagVersion) {
          await fastify.db.flagSchedule.update({
            where: { id: schedule.id },
            data: { status: "cancelled" },
          });
          continue;
        }

        // Execute the action
        switch (schedule.action) {
          case "enable":
            await fastify.db.flagVersion.update({
              where: { id: schedule.flagVersionId },
              data: { isEnabled: true },
            });
            break;

          case "disable":
            await fastify.db.flagVersion.update({
              where: { id: schedule.flagVersionId },
              data: { isEnabled: false },
            });
            break;

          case "update_rollout":
            const payload = schedule.payload as Record<string, unknown>;
            if (payload.compiled) {
              await fastify.db.flagVersion.update({
                where: { id: schedule.flagVersionId },
                data: { compiled: payload.compiled },
              });
            }
            break;
        }

        // Mark as executed
        await fastify.db.flagSchedule.update({
          where: { id: schedule.id },
          data: {
            status: "executed",
            executedAt: new Date(),
          },
        });

        results.push({ id: schedule.id, success: true });

        // Publish SSE update if cache is available
        // @ts-ignore - cache is added dynamically
        if (fastify.cache) {
          const channel = `env:${flagVersion.environmentId}`;
          // @ts-ignore
          await fastify.cache.publish(channel, JSON.stringify({
            type: "flag.scheduled_change",
            flagVersionId: schedule.flagVersionId,
            action: schedule.action,
          }));
        }
      } catch (error: any) {
        results.push({ id: schedule.id, success: false, error: error.message });
      }
    }

    return results;
  }
}
