import { ApiError } from '../utils/ApiError.js';
import { eventRepository } from '../repositories/event.repository.js';
import { templatesService } from './templates.service.js';
import { auditLogRepository } from '../repositories/auditLog.repository.js';
import { toEventDTO } from '../utils/serializeEvent.js';
import { escapeLike } from '../utils/escapeLike.js';
import { uniqueSlug } from '../utils/slugify.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';
import { EVENT_SORT_OPTIONS, DEFAULT_EVENT_SORT } from '../constants/eventSort.js';
import { EVENT_STATUS } from '../constants/eventStatus.js';
import { planService } from './plan.service.js';
import { guestRepository } from '../repositories/guest.repository.js';

const CAMEL_TO_SNAKE = {
  title: 'title',
  eventType: 'event_type',
  eventDate: 'event_date',
  eventTime: 'event_time',
  timezone: 'timezone',
  venueName: 'venue_name',
  venueAddress: 'venue_address',
  description: 'description',
  hostName: 'host_name',
};

function toSnakeCaseChanges(payload) {
  const changes = {};
  for (const [camelKey, snakeKey] of Object.entries(CAMEL_TO_SNAKE)) {
    if (Object.prototype.hasOwnProperty.call(payload, camelKey)) {
      changes[snakeKey] = payload[camelKey];
    }
  }
  return changes;
}

function parseConfig(row) {
  if (!row.invitation_config) return null;
  if (typeof row.invitation_config === 'object') return row.invitation_config;
  try {
    return JSON.parse(row.invitation_config);
  } catch {
    return null;
  }
}

async function generateUniqueSlug(title) {
  let slug = uniqueSlug(title);
  // uniqueSlug already appends a random suffix, but guard against the
  // astronomically unlikely collision rather than trusting probability alone.
  while (await eventRepository.slugExists(slug)) {
    slug = uniqueSlug(title);
  }
  return slug;
}

async function getOwnedOrThrow(userId, id) {
  const event = await eventRepository.findByIdAndUserId(id, userId);
  if (!event) {
    throw ApiError.notFound('Event not found');
  }
  return event;
}

/** Minimum bar for a draft to become public — see docs/architecture.md "Publish validation". */
function assertPublishable(event) {
  const details = [];

  if (!event.title || !event.title.trim()) {
    details.push({ field: 'title', message: 'Add an event name before publishing' });
  }
  if (!event.event_date) {
    details.push({ field: 'eventDate', message: 'Add an event date before publishing' });
  }
  if (event.template_status !== 'active') {
    details.push({ field: 'template', message: 'Choose a different template before publishing — this one is no longer available' });
  }

  const config = parseConfig(event);
  const hasEnabledSection = Array.isArray(config?.sections) && config.sections.some((s) => s.enabled);
  if (!hasEnabledSection) {
    details.push({ field: 'sections', message: 'Enable at least one invitation section before publishing' });
  }

  if (details.length) {
    throw ApiError.validation(details, 'This invitation is not ready to publish yet');
  }
}

export const eventsService = {
  async create(userId, payload, requestMeta) {
    await planService.assertCanCreateEvent(userId);
    await templatesService.assertSelectable(payload.templateId);

    const slug = await generateUniqueSlug(payload.title);
    const event = await eventRepository.create({
      userId,
      templateId: payload.templateId,
      title: payload.title,
      eventType: payload.eventType,
      slug,
      eventDate: payload.eventDate,
      eventTime: payload.eventTime,
      timezone: payload.timezone,
      venueName: payload.venueName,
      venueAddress: payload.venueAddress,
      description: payload.description,
      hostName: payload.hostName,
    });

    await auditLogRepository.record({
      userId,
      action: 'event.created',
      entityType: 'event',
      entityId: event.id,
      ipAddress: requestMeta?.ipAddress,
      userAgent: requestMeta?.userAgent,
    });

    return toEventDTO(event);
  },

  async list(userId, { page, limit, search, sort }) {
    const pagination = parsePagination({ page, limit });
    const orderBy = EVENT_SORT_OPTIONS[sort] || EVENT_SORT_OPTIONS[DEFAULT_EVENT_SORT];

    const { rows, total } = await eventRepository.findAllByUserId(userId, {
      limit: pagination.limit,
      offset: pagination.offset,
      search: search ? escapeLike(search) : undefined,
      orderBy,
    });

    return {
      events: rows.map(toEventDTO),
      pagination: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, total }),
    };
  },

  async getOne(userId, id) {
    const event = await getOwnedOrThrow(userId, id);
    return toEventDTO(event);
  },

  async update(userId, id, payload, requestMeta) {
    await getOwnedOrThrow(userId, id);

    const changes = toSnakeCaseChanges(payload);
    const event = await eventRepository.updateByIdAndUserId(id, userId, changes);

    await auditLogRepository.record({
      userId,
      action: 'event.updated',
      entityType: 'event',
      entityId: id,
      ipAddress: requestMeta?.ipAddress,
      userAgent: requestMeta?.userAgent,
    });

    return toEventDTO(event);
  },

  async changeTemplate(userId, id, templateId, requestMeta) {
    await getOwnedOrThrow(userId, id);
    await templatesService.assertSelectable(templateId);

    const event = await eventRepository.updateTemplateByIdAndUserId(id, userId, templateId);

    await auditLogRepository.record({
      userId,
      action: 'event.template_changed',
      entityType: 'event',
      entityId: id,
      metadata: { templateId },
      ipAddress: requestMeta?.ipAddress,
      userAgent: requestMeta?.userAgent,
    });

    return toEventDTO(event);
  },

  async duplicate(userId, id, requestMeta) {
    await planService.assertCanCreateEvent(userId);
    const original = await getOwnedOrThrow(userId, id);
    const slug = await generateUniqueSlug(`${original.title} copy`);

    const copy = await eventRepository.create({
      userId,
      templateId: original.template_id,
      title: `${original.title} (Copy)`,
      eventType: original.event_type,
      slug,
      eventDate: original.event_date,
      eventTime: original.event_time,
      timezone: original.timezone,
      venueName: original.venue_name,
      venueAddress: original.venue_address,
      description: original.description,
      hostName: original.host_name,
      invitationConfig: parseConfig(original) || undefined,
    });

    await auditLogRepository.record({
      userId,
      action: 'event.duplicated',
      entityType: 'event',
      entityId: copy.id,
      metadata: { sourceEventId: id },
      ipAddress: requestMeta?.ipAddress,
      userAgent: requestMeta?.userAgent,
    });

    return toEventDTO(copy);
  },

  async remove(userId, id, requestMeta) {
    await getOwnedOrThrow(userId, id);
    await eventRepository.softDeleteByIdAndUserId(id, userId);

    await auditLogRepository.record({
      userId,
      action: 'event.deleted',
      entityType: 'event',
      entityId: id,
      ipAddress: requestMeta?.ipAddress,
      userAgent: requestMeta?.userAgent,
    });
  },

  async countByUserId(userId) {
    return eventRepository.countByUserId(userId);
  },

  async publish(userId, id, requestMeta) {
    const event = await getOwnedOrThrow(userId, id);
    if (event.status === EVENT_STATUS.PUBLISHED) {
      return toEventDTO(event);
    }

    assertPublishable(event);
    await planService.assertCanPublish(userId);
    const published = await eventRepository.publishByIdAndUserId(id, userId);

    await auditLogRepository.record({
      userId,
      action: 'invitation.published',
      entityType: 'event',
      entityId: id,
      ipAddress: requestMeta?.ipAddress,
      userAgent: requestMeta?.userAgent,
    });

    return toEventDTO(published);
  },

  async unpublish(userId, id, requestMeta) {
    await getOwnedOrThrow(userId, id);
    const event = await eventRepository.unpublishByIdAndUserId(id, userId);

    await auditLogRepository.record({
      userId,
      action: 'invitation.unpublished',
      entityType: 'event',
      entityId: id,
      ipAddress: requestMeta?.ipAddress,
      userAgent: requestMeta?.userAgent,
    });

    return toEventDTO(event);
  },

  async getAnalytics(userId, id) {
    const event = await getOwnedOrThrow(userId, id);
    const rsvp = await guestRepository.getStatsByEventId(id);
    const responded = rsvp.attending + rsvp.declined;

    return {
      views: event.view_count,
      rsvp,
      responseRate: rsvp.total > 0 ? Math.round((responded / rsvp.total) * 100) : 0,
    };
  },
};
