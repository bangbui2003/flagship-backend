import { FastifyInstance } from "fastify";
import { createHttpError } from "../../core/http/error-handler.js";
import { FlagVersionService } from "../flag-versions/service.js";

export class TargetingRuleService {
  /**
   * Validate that rollout weights sum to exactly 100000 (100% with 3 decimal precision).
   */
  private static validateRolloutWeights(rollout: any[]) {
    if (!Array.isArray(rollout) || rollout.length === 0) {
      return; // Empty rollout is valid (catch-all / no distribution)
    }

    const totalWeight = rollout.reduce(
      (sum: number, r: any) => sum + (r.weight || 0),
      0,
    );

    if (totalWeight !== 100000) {
      throw createHttpError(400, "Rollout weights must sum to 100000", {
        detail: `Current total weight is ${totalWeight}, expected 100000`,
      });
    }
  }

  static async getAll(fastify: FastifyInstance, flagVersionId: string) {
    return await fastify.db.targetingRule.findMany({
      where: { flagVersionId },
      orderBy: { orderIndex: "asc" },
    });
  }

  static async getById(fastify: FastifyInstance, id: string) {
    const rule = await fastify.db.targetingRule.findUnique({
      where: { id },
    });

    if (!rule) {
      throw createHttpError(404, "Targeting rule not found", {
        detail: `No targeting rule found with ID '${id}'`,
      });
    }

    return rule;
  }

  static async create(
    fastify: FastifyInstance,
    flagVersionId: string,
    data: any,
  ) {
    const { condition, rollout } = data;
    let { orderIndex } = data;

    // Validate rollout weights
    TargetingRuleService.validateRolloutWeights(rollout);

    // Auto-assign orderIndex if not provided
    if (orderIndex === undefined || orderIndex === null) {
      const lastRule = await fastify.db.targetingRule.findFirst({
        where: { flagVersionId },
        orderBy: { orderIndex: "desc" },
        select: { orderIndex: true },
      });
      orderIndex = (lastRule?.orderIndex ?? -1) + 1;
    }

    const rule = await fastify.db.targetingRule.create({
      data: {
        flagVersion: { connect: { id: flagVersionId } },
        orderIndex,
        condition,
        rollout,
      },
    });

    // Trigger recompile of the flag version
    await FlagVersionService.compile(fastify, flagVersionId);

    return rule;
  }

  static async update(fastify: FastifyInstance, id: string, data: any) {
    const existing = await TargetingRuleService.getById(fastify, id);

    const { orderIndex, condition, rollout } = data;

    // Validate rollout weights if provided
    if (rollout) {
      TargetingRuleService.validateRolloutWeights(rollout);
    }

    const updated = await fastify.db.targetingRule.update({
      where: { id },
      data: { orderIndex, condition, rollout },
    });

    // Trigger recompile
    await FlagVersionService.compile(fastify, existing.flagVersionId);

    return updated;
  }

  /**
   * Reorder all rules within a flag version.
   */
  static async reorder(
    fastify: FastifyInstance,
    flagVersionId: string,
    order: Array<{ id: string; orderIndex: number }>,
  ) {
    // Use a transaction to update all at once
    await fastify.db.$transaction(
      order.map((item) =>
        fastify.db.targetingRule.update({
          where: { id: item.id },
          data: { orderIndex: item.orderIndex },
        }),
      ),
    );

    // Trigger recompile
    await FlagVersionService.compile(fastify, flagVersionId);

    return await TargetingRuleService.getAll(fastify, flagVersionId);
  }

  static async delete(fastify: FastifyInstance, id: string) {
    const rule = await TargetingRuleService.getById(fastify, id);

    await fastify.db.targetingRule.delete({
      where: { id },
    });

    // Trigger recompile
    await FlagVersionService.compile(fastify, rule.flagVersionId);
  }
}
