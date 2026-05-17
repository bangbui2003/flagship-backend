import { FastifyInstance } from "fastify";
import crypto from "crypto";
import { createHttpError } from "../../core/http/error-handler.js";

export class WebhookService {
  static async list(fastify: FastifyInstance, projectId: string) {
    return await fastify.db.webhook.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });
  }

  static async getById(fastify: FastifyInstance, id: string) {
    const webhook = await fastify.db.webhook.findUnique({
      where: { id },
    });

    if (!webhook) {
      throw createHttpError(404, "Webhook not found");
    }

    return webhook;
  }

  static async create(fastify: FastifyInstance, projectId: string, data: any) {
    const { name, url, events, secret } = data;

    // Generate secret if not provided
    const webhookSecret = secret || crypto.randomBytes(32).toString("hex");

    return await fastify.db.webhook.create({
      data: {
        projectId,
        name,
        url,
        events: events || ["flag.updated"],
        secret: webhookSecret,
        isActive: true,
      },
    });
  }

  static async update(fastify: FastifyInstance, id: string, data: any) {
    await WebhookService.getById(fastify, id);

    return await fastify.db.webhook.update({
      where: { id },
      data,
    });
  }

  static async delete(fastify: FastifyInstance, id: string) {
    await WebhookService.getById(fastify, id);

    await fastify.db.webhook.delete({
      where: { id },
    });
  }

  static async test(fastify: FastifyInstance, id: string) {
    const webhook = await WebhookService.getById(fastify, id);

    const payload = {
      event: "webhook.test",
      timestamp: new Date().toISOString(),
      data: {
        message: "This is a test webhook delivery",
      },
    };

    try {
      const signature = WebhookService.generateSignature(
        JSON.stringify(payload),
        webhook.secret || ""
      );

      const response = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Flagship-Signature": signature,
          "X-Flagship-Event": "webhook.test",
        },
        body: JSON.stringify(payload),
      });

      return {
        success: response.ok,
        statusCode: response.status,
        message: response.ok
          ? "Webhook delivered successfully"
          : `Webhook delivery failed with status ${response.status}`,
      };
    } catch (error: any) {
      return {
        success: false,
        statusCode: 0,
        message: `Webhook delivery failed: ${error.message}`,
      };
    }
  }

  /**
   * Deliver a webhook to all active webhooks for a project
   */
  static async deliver(
    fastify: FastifyInstance,
    projectId: string,
    event: string,
    data: any
  ) {
    const webhooks = await fastify.db.webhook.findMany({
      where: {
        projectId,
        isActive: true,
        events: { has: event },
      },
    });

    const payload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    const results = await Promise.allSettled(
      webhooks.map(async (webhook) => {
        const signature = WebhookService.generateSignature(
          JSON.stringify(payload),
          webhook.secret || ""
        );

        const response = await fetch(webhook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Flagship-Signature": signature,
            "X-Flagship-Event": event,
          },
          body: JSON.stringify(payload),
        });

        return {
          webhookId: webhook.id,
          success: response.ok,
          statusCode: response.status,
        };
      })
    );

    return results;
  }

  private static generateSignature(payload: string, secret: string): string {
    return crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
  }
}
