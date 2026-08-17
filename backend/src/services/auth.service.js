import parseDuration from '../utils/parseDuration.js';
import { ApiError } from '../utils/ApiError.js';
import { ROLES } from '../constants/roles.js';
import { userRepository } from '../repositories/user.repository.js';
import { refreshTokenRepository } from '../repositories/refreshToken.repository.js';
import { passwordResetTokenRepository } from '../repositories/passwordResetToken.repository.js';
import { auditLogRepository } from '../repositories/auditLog.repository.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { hashToken } from '../utils/hashToken.js';
import { generateToken } from '../utils/generateToken.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { toPublicUser } from '../utils/serializeUser.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const GENERIC_RESET_MESSAGE = 'If an account exists for that email, a password reset link has been sent';

async function issueSession(user, requestMeta) {
  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const refreshToken = signRefreshToken({ sub: user.id });

  await refreshTokenRepository.store({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + parseDuration(env.jwt.refreshExpires)),
    userAgent: requestMeta?.userAgent,
    ipAddress: requestMeta?.ipAddress,
  });

  return { accessToken, refreshToken };
}

export const authService = {
  async register({ name, email, password, phone }, requestMeta) {
    if (await userRepository.findByEmail(email)) {
      throw ApiError.conflict('An account with this email already exists');
    }
    if (phone && (await userRepository.findByPhone(phone))) {
      throw ApiError.conflict('An account with this phone number already exists');
    }

    const passwordHash = await hashPassword(password);
    const user = await userRepository.create({
      name,
      email,
      phone,
      passwordHash,
      role: ROLES.CUSTOMER,
    });

    const tokens = await issueSession(user, requestMeta);
    await auditLogRepository.record({
      userId: user.id,
      action: 'user.registered',
      entityType: 'user',
      entityId: user.id,
      ipAddress: requestMeta?.ipAddress,
      userAgent: requestMeta?.userAgent,
    });

    return { user: toPublicUser(user), ...tokens };
  },

  async login({ email, password }, requestMeta) {
    const user = await userRepository.findByEmail(email);
    if (!user || !(await comparePassword(password, user.password_hash))) {
      throw ApiError.unauthorized('Invalid email or password');
    }
    if (user.status !== 'active') {
      throw ApiError.forbidden('This account is not active');
    }

    const tokens = await issueSession(user, requestMeta);
    await auditLogRepository.record({
      userId: user.id,
      action: 'user.login',
      entityType: 'user',
      entityId: user.id,
      ipAddress: requestMeta?.ipAddress,
      userAgent: requestMeta?.userAgent,
    });

    return { user: toPublicUser(user), ...tokens };
  },

  async refresh(refreshToken, requestMeta) {
    if (!refreshToken) {
      throw ApiError.unauthorized('No session to refresh');
    }

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw ApiError.unauthorized('Invalid or expired session');
    }

    const tokenHash = hashToken(refreshToken);
    const stored = await refreshTokenRepository.findValid(tokenHash);
    if (!stored || stored.user_id !== payload.sub) {
      throw ApiError.unauthorized('Invalid or expired session');
    }

    const user = await userRepository.findById(payload.sub);
    if (!user || user.status !== 'active') {
      throw ApiError.unauthorized('Invalid or expired session');
    }

    // Rotate: revoke the used refresh token and issue a new pair.
    await refreshTokenRepository.revoke(tokenHash);
    const tokens = await issueSession(user, requestMeta);

    return { user: toPublicUser(user), ...tokens };
  },

  async logout(refreshToken) {
    if (!refreshToken) return;
    await refreshTokenRepository.revoke(hashToken(refreshToken));
  },

  async me(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    return toPublicUser(user);
  },

  async forgotPassword(email, requestMeta) {
    const user = await userRepository.findByEmail(email);

    // Always behave the same whether or not the account exists, to avoid
    // leaking which emails are registered.
    if (!user) {
      return { message: GENERIC_RESET_MESSAGE };
    }

    const rawToken = generateToken();
    await passwordResetTokenRepository.create({
      userId: user.id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    });

    const resetUrl = `${env.frontendUrl}/reset-password/${rawToken}`;

    // No email provider is configured yet (Phase 6). In development we log
    // the link so the flow is testable end to end; nothing is emailed.
    logger.info('Password reset requested', { userId: user.id, resetUrl: env.isProd ? undefined : resetUrl });

    await auditLogRepository.record({
      userId: user.id,
      action: 'user.password_reset_requested',
      entityType: 'user',
      entityId: user.id,
      ipAddress: requestMeta?.ipAddress,
      userAgent: requestMeta?.userAgent,
    });

    return { message: GENERIC_RESET_MESSAGE, ...(env.isProd ? {} : { resetUrl }) };
  },

  async resetPassword({ token, password }, requestMeta) {
    const tokenHash = hashToken(token);
    const stored = await passwordResetTokenRepository.findValid(tokenHash);
    if (!stored) {
      throw ApiError.badRequest('This reset link is invalid or has expired');
    }

    const passwordHash = await hashPassword(password);
    await userRepository.updatePassword(stored.user_id, passwordHash);
    await passwordResetTokenRepository.markUsed(tokenHash);
    await refreshTokenRepository.revokeAllForUser(stored.user_id);

    await auditLogRepository.record({
      userId: stored.user_id,
      action: 'user.password_reset',
      entityType: 'user',
      entityId: stored.user_id,
      ipAddress: requestMeta?.ipAddress,
      userAgent: requestMeta?.userAgent,
    });

    return { message: 'Password reset successfully. Please log in with your new password.' };
  },
};
