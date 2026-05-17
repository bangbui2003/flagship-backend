import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { AuthService } from "./service.js";
import {
  registerSchema,
  loginSchema,
  meSchema,
  listUsersSchema,
  updateRoleSchema,
} from "./schema.js";
import { createHttpError } from "../../core/http/error-handler.js";

export default async function authRoutes(fastify: FastifyInstance) {
  // Helper to get current user from token
  const getCurrentUser = async (request: FastifyRequest, reply: FastifyReply) => {
    const token =
      request.cookies.session ||
      request.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      throw createHttpError(401, "Not authenticated");
    }

    const user = await AuthService.validateSession(fastify, token);
    if (!user) {
      reply.clearCookie("session", { path: "/" });
      throw createHttpError(401, "Session expired");
    }

    return user;
  };

  // POST /v1/auth/register - Register new user
  fastify.post<{
    Body: { email: string; name: string; password: string };
  }>("/register", { schema: registerSchema }, async (request, reply) => {
    const user = await AuthService.register(fastify, request.body);
    return reply.code(201).send(user);
  });

  // POST /v1/auth/login - Login
  fastify.post<{
    Body: { email: string; password: string };
  }>("/login", { schema: loginSchema }, async (request, reply) => {
    const { email, password } = request.body;
    const result = await AuthService.login(fastify, email, password);

    // Set cookie for browser clients
    reply.setCookie("session", result.token, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: result.expiresAt,
    });

    return reply.send({
      user: result.user,
      token: result.token,
      expiresAt: result.expiresAt.toISOString(),
    });
  });

  // POST /v1/auth/logout - Logout
  fastify.post("/logout", async (request, reply) => {
    const token =
      request.cookies.session ||
      request.headers.authorization?.replace("Bearer ", "");

    if (token) {
      await AuthService.logout(fastify, token);
    }

    reply.clearCookie("session", { path: "/" });
    return reply.send({ success: true });
  });

  // GET /v1/auth/me - Get current user
  fastify.get("/me", { schema: meSchema }, async (request, reply) => {
    const token =
      request.cookies.session ||
      request.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return reply.code(401).send({ error: "Not authenticated" });
    }

    const user = await AuthService.validateSession(fastify, token);
    if (!user) {
      reply.clearCookie("session", { path: "/" });
      return reply.code(401).send({ error: "Session expired" });
    }

    return reply.send(user);
  });

  // GET /v1/auth/users - List all users (admin only)
  fastify.get("/users", { schema: listUsersSchema }, async (request, reply) => {
    const token =
      request.cookies.session ||
      request.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return reply.code(401).send({ error: "Not authenticated" });
    }

    const currentUser = await AuthService.validateSession(fastify, token);
    if (!currentUser) {
      return reply.code(401).send({ error: "Session expired" });
    }

    if (currentUser.role !== "admin") {
      return reply.code(403).send({ error: "Admin access required" });
    }

    const users = await AuthService.listUsers(fastify);
    return reply.send(users);
  });

  // PATCH /v1/auth/users/:userId/role - Update user role (admin only)
  fastify.patch<{
    Params: { userId: string };
    Body: { role: string };
  }>(
    "/users/:userId/role",
    { schema: updateRoleSchema },
    async (request, reply) => {
      const token =
        request.cookies.session ||
        request.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        return reply.code(401).send({ error: "Not authenticated" });
      }

      const currentUser = await AuthService.validateSession(fastify, token);
      if (!currentUser) {
        return reply.code(401).send({ error: "Session expired" });
      }

      if (currentUser.role !== "admin") {
        return reply.code(403).send({ error: "Admin access required" });
      }

      const { userId } = request.params;
      const { role } = request.body;

      const user = await AuthService.updateUserRole(fastify, userId, role);
      return reply.send(user);
    }
  );

  // POST /v1/auth/users - Admin create/invite a new user
  fastify.post<{
    Body: { email: string; name: string; password: string; role?: string };
  }>("/users", async (request, reply) => {
    const token =
      request.cookies.session ||
      request.headers.authorization?.replace("Bearer ", "");

    if (!token) return reply.code(401).send({ error: "Not authenticated" });

    const currentUser = await AuthService.validateSession(fastify, token);
    if (!currentUser) return reply.code(401).send({ error: "Session expired" });
    if (currentUser.role !== "admin") return reply.code(403).send({ error: "Admin access required" });

    const { email, name, password, role = "viewer" } = request.body;

    if (!email || !name || !password || password.length < 8) {
      throw createHttpError(400, "email, name and password (min 8 chars) are required");
    }

    const existing = await fastify.db.userAccount.findUnique({ where: { email } });
    if (existing) throw createHttpError(409, "A user with this email already exists");

    const user = await fastify.db.userAccount.create({
      data: {
        email,
        name,
        role: role as never,
        passwordHash: AuthService.hashPassword(password),
        isActive: true,
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    return reply.code(201).send(user);
  });

  // DELETE /v1/auth/users/:userId - Admin deactivate a user
  fastify.delete<{
    Params: { userId: string };
  }>("/users/:userId", async (request, reply) => {
    const token =
      request.cookies.session ||
      request.headers.authorization?.replace("Bearer ", "");

    if (!token) return reply.code(401).send({ error: "Not authenticated" });

    const currentUser = await AuthService.validateSession(fastify, token);
    if (!currentUser) return reply.code(401).send({ error: "Session expired" });
    if (currentUser.role !== "admin") return reply.code(403).send({ error: "Admin access required" });

    const { userId } = request.params;
    if (userId === currentUser.id) throw createHttpError(400, "Cannot deactivate your own account");

    const target = await fastify.db.userAccount.findUnique({ where: { id: userId } });
    if (!target) throw createHttpError(404, "User not found");

    await fastify.db.userAccount.update({
      where: { id: userId },
      data: { isActive: false },
    });

    // Invalidate all sessions for this user
    await fastify.db.session.deleteMany({ where: { userId } });

    return reply.code(204).send();
  });

  // PATCH /v1/auth/profile - Update current user profile
  fastify.patch<{
    Body: { name?: string; email?: string };
  }>("/profile", async (request, reply) => {
    const currentUser = await getCurrentUser(request, reply);
    const { name, email } = request.body;

    const updateData: Record<string, string> = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;

    const user = await fastify.db.userAccount.update({
      where: { id: currentUser.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    return reply.send(user);
  });

  // PATCH /v1/auth/password - Change password
  fastify.patch<{
    Body: { currentPassword: string; newPassword: string };
  }>("/password", async (request, reply) => {
    const currentUser = await getCurrentUser(request, reply);
    const { currentPassword, newPassword } = request.body;

    // Verify current password
    const user = await fastify.db.userAccount.findUnique({
      where: { id: currentUser.id },
    });

    if (!user) {
      throw createHttpError(404, "User not found");
    }

    if (!AuthService.verifyPassword(currentPassword, user.passwordHash)) {
      throw createHttpError(400, "Current password is incorrect");
    }

    await fastify.db.userAccount.update({
      where: { id: currentUser.id },
      data: { passwordHash: AuthService.hashPassword(newPassword) },
    });

    return reply.send({ success: true });
  });

  // POST /v1/auth/forgot-password - Request password reset
  fastify.post<{
    Body: { email: string };
  }>("/forgot-password", async (request, reply) => {
    const { email } = request.body;

    // Always return success to prevent email enumeration
    const user = await fastify.db.userAccount.findUnique({
      where: { email },
    });

    if (user && user.isActive) {
      const crypto = await import("crypto");
      const resetToken = crypto.randomBytes(32).toString("hex");

      // Invalidate any existing unused tokens for this user
      await fastify.db.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      // Store token with 1-hour expiry
      await fastify.db.passwordResetToken.create({
        data: {
          userId: user.id,
          token: resetToken,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      // Log reset URL for development (replace with email service in production)
      const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/auth/reset-password?token=${resetToken}`;
      fastify.log.info({ email, resetUrl }, "Password reset requested");
    }

    return reply.send({ success: true, message: "If the email exists, a reset link has been sent." });
  });

  // POST /v1/auth/reset-password - Reset password with token
  fastify.post<{
    Body: { token: string; password: string };
  }>("/reset-password", async (request, reply) => {
    const { token, password } = request.body;

    if (!token || token.length < 10) {
      throw createHttpError(400, "Invalid or expired reset token");
    }

    if (!password || password.length < 8) {
      throw createHttpError(400, "Password must be at least 8 characters");
    }

    const resetToken = await fastify.db.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken) {
      throw createHttpError(400, "Invalid or expired reset token");
    }

    if (resetToken.usedAt) {
      throw createHttpError(400, "Reset token has already been used");
    }

    if (resetToken.expiresAt < new Date()) {
      throw createHttpError(400, "Reset token has expired");
    }

    if (!resetToken.user.isActive) {
      throw createHttpError(400, "Account is disabled");
    }

    await fastify.db.$transaction([
      fastify.db.userAccount.update({
        where: { id: resetToken.userId },
        data: { passwordHash: AuthService.hashPassword(password) },
      }),
      fastify.db.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return reply.send({ success: true, message: "Password has been reset successfully." });
  });
}
