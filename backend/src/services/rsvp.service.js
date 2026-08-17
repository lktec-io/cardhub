import { ApiError } from '../utils/ApiError.js';
import { eventRepository } from '../repositories/event.repository.js';
import { guestRepository } from '../repositories/guest.repository.js';
import { auditLogRepository } from '../repositories/auditLog.repository.js';
import { notificationsService } from './notifications.service.js';
import { NOTIFICATION_TYPES } from '../constants/notificationTypes.js';

const SLUG_RE = /^[a-z0-9-]{1,220}$/;

/**
 * Guests never have CardHub accounts. Identification/duplicate-protection
 * strategy: phone number, when provided, is the natural key — a second
 * RSVP with the same (event, phone) updates the existing guest instead of
 * creating a duplicate (matches the guests.event_id+phone unique
 * constraint). Without a phone, each submission creates a new guest,
 * exactly like the CSV import / manual-add rule: families legitimately
 * share names, so name alone is never treated as a duplicate key.
 */
export const rsvpService = {
  async submit(slug, payload, requestMeta) {
    if (typeof slug !== 'string' || !SLUG_RE.test(slug)) {
      throw ApiError.notFound('Invitation not found');
    }

    const event = await eventRepository.findPublishedBySlug(slug);
    if (!event) {
      throw ApiError.notFound('Invitation not found');
    }

    const existing = payload.phone ? await guestRepository.findByEventIdAndPhone(event.id, payload.phone) : null;

    const guest = existing
      ? await guestRepository.updateByIdAndEventId(existing.id, event.id, {
          name: payload.name,
          email: payload.email || existing.email,
          party_size: payload.partySize || existing.party_size,
          status: payload.status,
        })
      : await guestRepository.create({
          eventId: event.id,
          name: payload.name,
          phone: payload.phone,
          email: payload.email,
          partySize: payload.partySize,
          status: payload.status,
        });

    await auditLogRepository.record({
      userId: event.user_id,
      action: 'rsvp.submitted',
      entityType: 'guest',
      entityId: guest.id,
      metadata: { status: payload.status },
      ipAddress: requestMeta?.ipAddress,
      userAgent: requestMeta?.userAgent,
    });

    await notificationsService.notify(event.user_id, {
      type: NOTIFICATION_TYPES.RSVP_RECEIVED,
      title: `${payload.name} responded ${payload.status === 'attending' ? 'Attending' : 'Not Attending'}`,
      message: `${payload.name} responded to your invitation "${event.title}".`,
      data: { eventId: event.id, guestId: guest.id, status: payload.status },
    });

    return {
      message:
        payload.status === 'attending'
          ? "Thank you — we can't wait to celebrate with you!"
          : 'Thank you for letting us know.',
    };
  },
};
