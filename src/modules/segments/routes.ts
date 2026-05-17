import { FastifyInstance } from "fastify";
import { SegmentService } from "./service.js";
import {
  listSegmentsSchema,
  getSegmentSchema,
  createSegmentSchema,
  updateSegmentSchema,
  deleteSegmentSchema,
  getSegmentUsersSchema,
  addSegmentUsersSchema,
  removeSegmentUsersSchema,
  checkSegmentUserSchema,
  type CreateSegmentBody,
  type UpdateSegmentBody,
  type AddUsersBody,
  type RemoveUsersBody,
} from "./schema.js";

export async function segmentRoutes(fastify: FastifyInstance) {
  // List all segments for a project
  fastify.get<{
    Params: { projectId: string };
  }>(
    "/v1/projects/:projectId/segments",
    { schema: listSegmentsSchema },
    async (request) => {
      return SegmentService.list(fastify, request.params.projectId);
    }
  );

  // Get a single segment
  fastify.get<{
    Params: { projectId: string; segmentId: string };
  }>(
    "/v1/projects/:projectId/segments/:segmentId",
    { schema: getSegmentSchema },
    async (request) => {
      return SegmentService.getById(
        fastify,
        request.params.projectId,
        request.params.segmentId
      );
    }
  );

  // Create a segment
  fastify.post<{
    Params: { projectId: string };
    Body: CreateSegmentBody;
  }>(
    "/v1/projects/:projectId/segments",
    { schema: createSegmentSchema },
    async (request, reply) => {
      const segment = await SegmentService.create(
        fastify,
        request.params.projectId,
        request.body
      );
      return reply.status(201).send(segment);
    }
  );

  // Update a segment
  fastify.patch<{
    Params: { projectId: string; segmentId: string };
    Body: UpdateSegmentBody;
  }>(
    "/v1/projects/:projectId/segments/:segmentId",
    { schema: updateSegmentSchema },
    async (request) => {
      return SegmentService.update(
        fastify,
        request.params.projectId,
        request.params.segmentId,
        request.body
      );
    }
  );

  // Delete a segment
  fastify.delete<{
    Params: { projectId: string; segmentId: string };
  }>(
    "/v1/projects/:projectId/segments/:segmentId",
    { schema: deleteSegmentSchema },
    async (request) => {
      return SegmentService.delete(
        fastify,
        request.params.projectId,
        request.params.segmentId
      );
    }
  );

  // ============ Segment Users Routes ============

  // Get users in a segment
  fastify.get<{
    Params: { projectId: string; segmentId: string };
    Querystring: { limit?: number; offset?: number };
  }>(
    "/v1/projects/:projectId/segments/:segmentId/users",
    { schema: getSegmentUsersSchema },
    async (request) => {
      return SegmentService.getUsers(
        fastify,
        request.params.projectId,
        request.params.segmentId,
        request.query.limit,
        request.query.offset
      );
    }
  );

  // Add users to a segment
  fastify.post<{
    Params: { projectId: string; segmentId: string };
    Body: AddUsersBody;
  }>(
    "/v1/projects/:projectId/segments/:segmentId/users",
    { schema: addSegmentUsersSchema },
    async (request) => {
      return SegmentService.addUsers(
        fastify,
        request.params.projectId,
        request.params.segmentId,
        request.body.userKeys
      );
    }
  );

  // Remove users from a segment
  fastify.delete<{
    Params: { projectId: string; segmentId: string };
    Body: RemoveUsersBody;
  }>(
    "/v1/projects/:projectId/segments/:segmentId/users",
    { schema: removeSegmentUsersSchema },
    async (request) => {
      return SegmentService.removeUsers(
        fastify,
        request.params.projectId,
        request.params.segmentId,
        request.body.userKeys
      );
    }
  );

  // Check if a user is in a segment
  fastify.get<{
    Params: { projectId: string; segmentId: string; userKey: string };
  }>(
    "/v1/projects/:projectId/segments/:segmentId/users/:userKey",
    { schema: checkSegmentUserSchema },
    async (request) => {
      return SegmentService.checkUser(
        fastify,
        request.params.projectId,
        request.params.segmentId,
        request.params.userKey
      );
    }
  );
}
