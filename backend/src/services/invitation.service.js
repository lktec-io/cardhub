import { ApiError } from '../utils/ApiError.js';
import { eventRepository } from '../repositories/event.repository.js';
import { auditLogRepository } from '../repositories/auditLog.repository.js';
import { validateAndNormalizeInvitationConfig } from '../validators/invitation.validator.js';
import { toEventDTO } from '../utils/serializeEvent.js';
import { buildDefaultInvitationConfig } from '../utils/defaultInvitationConfig.js';

async function getOwnedOrThrow(userId, id) {
  const event = await eventRepository.findByIdAndUserId(id, userId);
  if (!event) {
    throw ApiError.notFound('Event not found');
  }
  return event;
}

export const invitationService = {
  async getConfig(userId, id) {
    const event = await getOwnedOrThrow(userId, id);
    const dto = toEventDTO(event);
    return dto.invitationConfig || buildDefaultInvitationConfig();
  },

  async updateConfig(userId, id, rawConfig, requestMeta) {
    await getOwnedOrThrow(userId, id);

    const config = validateAndNormalizeInvitationConfig(rawConfig);
    const event = await eventRepository.updateInvitationConfigByIdAndUserId(id, userId, config);

    await auditLogRepository.record({
      userId,
      action: 'invitation.updated',
      entityType: 'event',
      entityId: id,
      ipAddress: requestMeta?.ipAddress,
      userAgent: requestMeta?.userAgent,
    });

    return toEventDTO(event).invitationConfig;
  },
};
