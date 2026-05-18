import { FastifyInstance } from "fastify";
import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { createHttpError } from "../../core/http/error-handler.js";

// Session TTL: 7 days
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export class AuthService {
  static hashPassword(password: string): string {
    const salt = randomBytes(16).toString("hex");
    const hash = createHash("sha256")
      .update(password + salt)
      .digest("hex");
    return `${salt}:${hash}`;
  }

  static verifyPassword(password: string, storedHash: string): boolean {
    const [salt, hash] = storedHash.split(":");
    const inputHash = createHash("sha256")
      .update(password + salt)
      .digest("hex");

    try {
      return timingSafeEqual(Buffer.from(hash), Buffer.from(inputHash));
    } catch {
      return false;
    }
  }

  static generateToken(): string {
    return randomBytes(32).toString("hex");
  }

  static async register(
    fastify: FastifyInstance,
    data: { email: string; name: string; password: string; role?: string }
  ): Promise<AuthUser> {
    const existing = await fastify.db.userAccount.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existing) {
      throw createHttpError(409, "Email already registered");
    }

    const passwordHash = AuthService.hashPassword(data.password);

    const user = await fastify.db.userAccount.create({
      data: {
        email: data.email.toLowerCase(),
        name: data.name,
        passwordHash,
        role: data.role || "developer",
      },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  static async login(
    fastify: FastifyInstance,
    email: string,
    password: string
  ): Promise<{ user: AuthUser; token: string; expiresAt: Date }> {
    const user = await fastify.db.userAccount.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.isActive) {
      throw createHttpError(401, "Invalid email or password");
    }

    if (!AuthService.verifyPassword(password, user.passwordHash)) {
      throw createHttpError(401, "Invalid email or password");
    }

    const token = AuthService.generateToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    await fastify.db.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    await fastify.db.userAccount.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
      expiresAt,
    };
  }

  static async validateSession(
    fastify: FastifyInstance,
    token: string
  ): Promise<AuthUser | null> {
    const session = await fastify.db.session.findUnique({
      where: { token },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await fastify.db.session.delete({ where: { id: session.id } });
      }
      return null;
    }

    const user = await fastify.db.userAccount.findUnique({
      where: { id: session.userId },
    });

    if (!user || !user.isActive) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  static async logout(fastify: FastifyInstance, token: string): Promise<void> {
    await fastify.db.session.deleteMany({
      where: { token },
    });
  }

  static async getUserById(
    fastify: FastifyInstance,
    userId: string
  ): Promise<AuthUser | null> {
    const user = await fastify.db.userAccount.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  static async listUsers(fastify: FastifyInstance): Promise<AuthUser[]> {
    const users = await fastify.db.userAccount.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
    }));
  }

  static async updateUserRole(
    fastify: FastifyInstance,
    userId: string,
    role: string
  ): Promise<AuthUser> {
    const validRoles = ["admin", "developer", "product_manager", "qa", "analyst"];
    if (!validRoles.includes(role)) {
      throw createHttpError(400, `Invalid role. Must be one of: ${validRoles.join(", ")}`);
    }

    const user = await fastify.db.userAccount.update({
      where: { id: userId },
      data: { role },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  static hasPermission(
    user: AuthUser,
    action: string,
    resource: string
  ): boolean {
    const permissions: Record<string, string[]> = {
      admin: ["*"],
      developer: [
        "flag:read",
        "flag:create",
        "flag:update",
        "flag:toggle",
        "environment:read",
        "segment:read",
        "segment:create",
        "segment:update",
        "analytics:read",
        "audit:read",
      ],
      product_manager: [
        "flag:read",
        "flag:update",
        "flag:toggle",
        "environment:read",
        "segment:read",
        "segment:create",
        "segment:update",
        "analytics:read",
      ],
      qa: [
        "flag:read",
        "flag:toggle", // Only in non-production
        "environment:read",
        "segment:read",
        "analytics:read",
      ],
      analyst: [
        "flag:read",
        "environment:read",
        "segment:read",
        "analytics:read",
        "audit:read",
      ],
    };

    const userPermissions = permissions[user.role] || [];
    const requiredPermission = `${resource}:${action}`;

    return (
      userPermissions.includes("*") ||
      userPermissions.includes(requiredPermission)
    );
  }
}
