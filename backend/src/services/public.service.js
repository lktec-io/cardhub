import { ApiError } from '../utils/ApiError.js';
import { eventRepository } from '../repositories/event.repository.js';
import { toPublicInvitationDTO } from '../utils/serializeEvent.js';
import { logger } from '../utils/logger.js';

const SLUG_RE = /^[a-z0-9-]{1,220}$/;

export const publicService = {
  async getInvitationBySlug(slug) {
    // Same "not found" for a malformed slug, an unpublished event, and a
    // nonexistent one — never confirm whether a private event exists.
    if (typeof slug !== 'string' || !SLUG_RE.test(slug)) {
      throw ApiError.notFound('Invitation not found');
    }

    const event = await eventRepository.findPublishedBySlug(slug);
    if (!event) {
      throw ApiError.notFound('Invitation not found');
    }

    // Fire-and-forget — a simple aggregate counter, not a per-view row (so
    // rapid refreshes never create duplicate-row bloat), and analytics can
    // never fail the actual invitation response.
    eventRepository.incrementViewCount(event.id).catch((error) => {
      logger.warn('Failed to record invitation view', { eventId: event.id, message: error.message });
    });

    return toPublicInvitationDTO(event);
  },
};
