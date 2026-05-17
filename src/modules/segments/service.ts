import { FastifyInstance } from "fastify";
import { createHttpError } from "../../core/http/error-handler.js";
import type { CreateSegmentBody, UpdateSegmentBody } from "./schema.js";

export class SegmentService {
  /**
   * List all segments for a project
   */
  static async list(fastify: FastifyInstance, projectId: string) {
    const segments = await fastify.db.segment.findMany({
      where: { projectId },
      include: {
        _count: {
          select: { segmentUsers: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return segments.map((s) => ({
      id: s.id,
      projectId: s.projectId,
      key: s.key,
      name: s.name,
      description: s.description,
      rules: s.rules,
      userCount: s._count.segmentUsers,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));
  }

  /**
   * Get a single segment by ID
   */
  static async getById(fastify: FastifyInstance, projectId: string, segmentId: string) {
    const segment = await fastify.db.segment.findFirst({
      where: { id: segmentId, projectId },
      include: {
        _count: {
          select: { segmentUsers: true },
        },
      },
    });

    if (!segment) {
      throw createHttpError(404, "Segment not found");
    }

    return {
      id: segment.id,
      projectId: segment.projectId,
      key: segment.key,
      name: segment.name,
      description: segment.description,
      rules: segment.rules,
      userCount: segment._count.segmentUsers,
      createdAt: segment.createdAt.toISOString(),
      updatedAt: segment.updatedAt.toISOString(),
    };
  }

  /**
   * Create a new segment
   */
  static async create(
    fastify: FastifyInstance,
    projectId: string,
    data: CreateSegmentBody
  ) {
    // Verify project exists
    const project = await fastify.db.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw createHttpError(404, "Project not found");
    }

    // Check for duplicate key
    const existing = await fastify.db.segment.findUnique({
      where: {
        projectId_key: { projectId, key: data.key },
      },
    });

    if (existing) {
      throw createHttpError(409, "Segment with this key already exists");
    }

    const segment = await fastify.db.segment.create({
      data: {
        projectId,
        key: data.key,
        name: data.name,
        description: data.description,
      },
    });

    return {
      id: segment.id,
      projectId: segment.projectId,
      key: segment.key,
      name: segment.name,
      description: segment.description,
      userCount: 0,
      createdAt: segment.createdAt.toISOString(),
      updatedAt: segment.updatedAt.toISOString(),
    };
  }

  /**
   * Update a segment
   */
  static async update(
    fastify: FastifyInstance,
    projectId: string,
    segmentId: string,
    data: UpdateSegmentBody
  ) {
    const segment = await fastify.db.segment.findFirst({
      where: { id: segmentId, projectId },
    });

    if (!segment) {
      throw createHttpError(404, "Segment not found");
    }

    // If updating key, check for duplicates
    if (data.key && data.key !== segment.key) {
      const existing = await fastify.db.segment.findUnique({
        where: {
          projectId_key: { projectId, key: data.key },
        },
      });

      if (existing) {
        throw createHttpError(409, "Segment with this key already exists");
      }
    }

    const updated = await fastify.db.segment.update({
      where: { id: segmentId },
      data: {
        key: data.key,
        name: data.name,
        description: data.description,
        rules: data.rules !== undefined ? JSON.parse(JSON.stringify(data.rules)) : undefined,
      },
      include: {
        _count: {
          select: { segmentUsers: true },
        },
      },
    });

    return {
      id: updated.id,
      projectId: updated.projectId,
      key: updated.key,
      name: updated.name,
      description: updated.description,
      rules: updated.rules,
      userCount: updated._count.segmentUsers,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Delete a segment
   */
  static async delete(fastify: FastifyInstance, projectId: string, segmentId: string) {
    const segment = await fastify.db.segment.findFirst({
      where: { id: segmentId, projectId },
    });

    if (!segment) {
      throw createHttpError(404, "Segment not found");
    }

    await fastify.db.segment.delete({
      where: { id: segmentId },
    });

    return { success: true };
  }

  /**
   * Get users in a segment with their attributes
   */
  static async getUsers(
    fastify: FastifyInstance,
    projectId: string,
    segmentId: string,
    limit = 100,
    offset = 0
  ) {
    const segment = await fastify.db.segment.findFirst({
      where: { id: segmentId, projectId },
    });

    if (!segment) {
      throw createHttpError(404, "Segment not found");
    }

    const [segmentUsers, total] = await Promise.all([
      fastify.db.segmentUser.findMany({
        where: { segmentId },
        select: { userKey: true },
        take: limit,
        skip: offset,
        orderBy: { userKey: "asc" },
      }),
      fastify.db.segmentUser.count({ where: { segmentId } }),
    ]);

    // Get user details from User table
    const userKeys = segmentUsers.map((u) => u.userKey);
    const userDetails = await fastify.db.user.findMany({
      where: { key: { in: userKeys } },
    });

    // Create a map for quick lookup
    const userMap = new Map(userDetails.map((u) => [u.key, u.attributes]));

    // Combine segment users with their attributes
    const users = segmentUsers.map((su) => ({
      userKey: su.userKey,
      attributes: userMap.get(su.userKey) || {},
    }));

    return {
      segmentId,
      users,
      total,
    };
  }

  /**
   * Add users to a segment
   */
  static async addUsers(
    fastify: FastifyInstance,
    projectId: string,
    segmentId: string,
    userKeys: string[]
  ) {
    const segment = await fastify.db.segment.findFirst({
      where: { id: segmentId, projectId },
    });

    if (!segment) {
      throw createHttpError(404, "Segment not found");
    }

    // Use createMany with skipDuplicates to handle existing users
    await fastify.db.segmentUser.createMany({
      data: userKeys.map((userKey) => ({
        segmentId,
        userKey,
      })),
      skipDuplicates: true,
    });

    const total = await fastify.db.segmentUser.count({ where: { segmentId } });

    return {
      segmentId,
      added: userKeys.length,
      total,
    };
  }

  /**
   * Remove users from a segment
   */
  static async removeUsers(
    fastify: FastifyInstance,
    projectId: string,
    segmentId: string,
    userKeys: string[]
  ) {
    const segment = await fastify.db.segment.findFirst({
      where: { id: segmentId, projectId },
    });

    if (!segment) {
      throw createHttpError(404, "Segment not found");
    }

    await fastify.db.segmentUser.deleteMany({
      where: {
        segmentId,
        userKey: { in: userKeys },
      },
    });

    const total = await fastify.db.segmentUser.count({ where: { segmentId } });

    return {
      segmentId,
      removed: userKeys.length,
      total,
    };
  }

  /**
   * Check if a user is in a segment
   */
  static async checkUser(
    fastify: FastifyInstance,
    projectId: string,
    segmentId: string,
    userKey: string
  ) {
    const segment = await fastify.db.segment.findFirst({
      where: { id: segmentId, projectId },
    });

    if (!segment) {
      throw createHttpError(404, "Segment not found");
    }

    const user = await fastify.db.segmentUser.findUnique({
      where: {
        segmentId_userKey: { segmentId, userKey },
      },
    });

    return {
      segmentId,
      userKey,
      isMember: !!user,
    };
  }
}
