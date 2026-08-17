import { ApiError } from '../utils/ApiError.js';
import { userRepository } from '../repositories/user.repository.js';
import { userPreferencesRepository } from '../repositories/userPreferences.repository.js';
import { refreshTokenRepository } from '../repositories/refreshToken.repository.js';
import { auditLogRepository } from '../repositories/auditLog.repository.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { toPublicUser } from '../utils/serializeUser.js';

function toPublicPreferences(row) {
  return {
    emailNotifications: Boolean(row.email_notifications),
    smsNotifications: Boolean(row.sms_notifications),
    marketingNotifications: Boolean(row.marketing_notifications),
    securityNotifications: Boolean(row.security_notifications),
  };
}

export const usersService = {
  async updateProfile(userId, { name, phone }) {
    if (phone) {
      const existing = await userRepository.findByPhone(phone);
      if (existing && existing.id !== userId) {
        throw ApiError.conflict('An account with this phone number already exists');
      }
    }

    const user = await userRepository.updateProfile(userId, { name, phone });
    await auditLogRepository.record({
      userId,
      action: 'user.profile_updated',
      entityType: 'user',
      entityId: userId,
    });

    return toPublicUser(user);
  },

  async changePassword(userId, { currentPassword, newPassword }, requestMeta) {
    const user = await userRepository.findById(userId);
    if (!user || !(await comparePassword(currentPassword, user.password_hash))) {
      throw ApiError.unauthorized('Current password is incorrect');
    }

    const passwordHash = await hashPassword(newPassword);
    await userRepository.updatePassword(userId, passwordHash);
    // Force re-authentication everywhere else on the account.
    await refreshTokenRepository.revokeAllForUser(userId);

    await auditLogRepository.record({
      userId,
      action: 'user.password_changed',
      entityType: 'user',
      entityId: userId,
      ipAddress: requestMeta?.ipAddress,
      userAgent: requestMeta?.userAgent,
    });

    return { message: 'Password changed successfully' };
  },

  async getPreferences(userId) {
    const row = await userPreferencesRepository.findByUserId(userId);
    return toPublicPreferences(row);
  },

  async updatePreferences(userId, { preferredLanguage, ...notificationPrefs }) {
    if (preferredLanguage) {
      await userRepository.updatePreferredLanguage(userId, preferredLanguage);
    }

    const dbPayload = {};
    if (notificationPrefs.emailNotifications !== undefined) dbPayload.email_notifications = notificationPrefs.emailNotifications ? 1 : 0;
    if (notificationPrefs.smsNotifications !== undefined) dbPayload.sms_notifications = notificationPrefs.smsNotifications ? 1 : 0;
    if (notificationPrefs.marketingNotifications !== undefined) dbPayload.marketing_notifications = notificationPrefs.marketingNotifications ? 1 : 0;
    if (notificationPrefs.securityNotifications !== undefined) dbPayload.security_notifications = notificationPrefs.securityNotifications ? 1 : 0;

    const row = await userPreferencesRepository.upsert(userId, dbPayload);

    await auditLogRepository.record({
      userId,
      action: 'user.preferences_updated',
      entityType: 'user',
      entityId: userId,
    });

    const user = preferredLanguage ? await userRepository.findById(userId) : null;

    return {
      preferences: toPublicPreferences(row),
      preferredLanguage: preferredLanguage ? user.preferred_language : undefined,
    };
  },
};
