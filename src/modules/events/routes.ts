import { FastifyInstance } from "fastify";
import {
  ingestEventSchema,
  ingestBatchEventSchema,
  getEventsSchema,
} from "./schema.js";
import { EventService } from "./service.js";

export default async function eventRoutes(fastify: FastifyInstance) {
  // Ingest single event (SDK → Backend)
  fastify.post(
    "/",
    { schema: ingestEventSchema },
    async (request, reply) => {
      const apiKey = request.headers["x-api-key"] as string;
      const event = await EventService.ingest(
        fastify,
        apiKey,
        request.body as any,
      );
      return reply.code(201).send(event);
    },
  );

  // Batch ingest events (SDK flush → Backend)
  fastify.post(
    "/batch",
    { schema: ingestBatchEventSchema },
    async (request, reply) => {
      const apiKey = request.headers["x-api-key"] as string;
      const { events } = request.body as { events: any[] };
      const result = await EventService.ingestBatch(
        fastify,
        apiKey,
        events,
      );
      return reply.code(201).send(result);
    },
  );

  // Query events (admin endpoint with filters + pagination)
  fastify.get(
    "/",
    { schema: getEventsSchema },
    async (request, reply) => {
      const filters = request.query as any;
      const result = await EventService.query(fastify, filters);
      return reply.send(result);
    },
  );
}
