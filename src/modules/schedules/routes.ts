import { FastifyInstance } from "fastify";
import { ScheduleService } from "./service.js";

export default async function scheduleRoutes(fastify: FastifyInstance) {
  // List schedules for a project
  fastify.get("/", async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const { status, flagId } = request.query as { status?: string; flagId?: string };
    
    const schedules = await ScheduleService.list(fastify, projectId, { status, flagId });
    return reply.send(schedules);
  });

  // Get a single schedule
  fastify.get("/:scheduleId", async (request, reply) => {
    const { scheduleId } = request.params as { scheduleId: string };
    const schedule = await ScheduleService.getById(fastify, scheduleId);
    return reply.send(schedule);
  });

  // Create a schedule
  fastify.post("/", async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const schedule = await ScheduleService.create(fastify, projectId, request.body as any);
    return reply.code(201).send(schedule);
  });

  // Update a schedule
  fastify.patch("/:scheduleId", async (request, reply) => {
    const { scheduleId } = request.params as { scheduleId: string };
    const schedule = await ScheduleService.update(fastify, scheduleId, request.body as any);
    return reply.send(schedule);
  });

  // Cancel a schedule
  fastify.post("/:scheduleId/cancel", async (request, reply) => {
    const { scheduleId } = request.params as { scheduleId: string };
    const schedule = await ScheduleService.cancel(fastify, scheduleId);
    return reply.send(schedule);
  });

  // Delete a schedule
  fastify.delete("/:scheduleId", async (request, reply) => {
    const { scheduleId } = request.params as { scheduleId: string };
    await ScheduleService.delete(fastify, scheduleId);
    return reply.code(204).send();
  });

  // Execute pending schedules (for cron/background job)
  fastify.post("/execute", async (request, reply) => {
    const results = await ScheduleService.executePendingSchedules(fastify);
    return reply.send({ executed: results.length, results });
  });
}
