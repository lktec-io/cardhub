import { ApiError } from '../utils/ApiError.js';
import { eventRepository } from '../repositories/event.repository.js';
import { guestRepository } from '../repositories/guest.repository.js';
import { auditLogRepository } from '../repositories/auditLog.repository.js';
import { escapeLike } from '../utils/escapeLike.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';
import { planService } from './plan.service.js';

// Same ownership pattern as events.service.js / invitation.service.js —
// every guest operation is reached only through the event it belongs to.
async function assertEventOwnership(userId, eventId) {
  const event = await eventRepository.findByIdAndUserId(eventId, userId);
  if (!event) {
    throw ApiError.notFound('Event not found');
  }
  return event;
}

function toGuestDTO(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    partySize: row.party_size,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getOwnedGuestOrThrow(eventId, guestId) {
  const guest = await guestRepository.findByIdAndEventId(guestId, eventId);
  if (!guest) {
    throw ApiError.notFound('Guest not found');
  }
  return guest;
}

export const guestsService = {
  async list(userId, eventId, { page, limit, search, status }) {
    await assertEventOwnership(userId, eventId);

    const pagination = parsePagination({ page, limit });
    const { rows, total } = await guestRepository.findAllByEventId(eventId, {
      limit: pagination.limit,
      offset: pagination.offset,
      search: search ? escapeLike(search) : undefined,
      status,
    });

    return {
      guests: rows.map(toGuestDTO),
      pagination: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, total }),
    };
  },

  async stats(userId, eventId) {
    await assertEventOwnership(userId, eventId);
    return guestRepository.getStatsByEventId(eventId);
  },

  async create(userId, eventId, payload, requestMeta) {
    await assertEventOwnership(userId, eventId);
    await planService.assertCanAddGuest(userId, eventId, 1);

    if (payload.phone) {
      const existing = await guestRepository.findByEventIdAndPhone(eventId, payload.phone);
      if (existing) {
        throw ApiError.conflict('A guest with this phone number already exists for this event');
      }
    }

    const guest = await guestRepository.create({ eventId, ...payload });

    await auditLogRepository.record({
      userId,
      action: 'guest.created',
      entityType: 'guest',
      entityId: guest.id,
      ipAddress: requestMeta?.ipAddress,
      userAgent: requestMeta?.userAgent,
    });

    return toGuestDTO(guest);
  },

  async getOne(userId, eventId, guestId) {
    await assertEventOwnership(userId, eventId);
    const guest = await getOwnedGuestOrThrow(eventId, guestId);
    return toGuestDTO(guest);
  },

  async update(userId, eventId, guestId, payload, requestMeta) {
    await assertEventOwnership(userId, eventId);
    await getOwnedGuestOrThrow(eventId, guestId);

    if (payload.phone) {
      const existing = await guestRepository.findByEventIdAndPhone(eventId, payload.phone);
      if (existing && existing.id !== Number(guestId)) {
        throw ApiError.conflict('A guest with this phone number already exists for this event');
      }
    }

    const changes = {};
    if ('name' in payload) changes.name = payload.name;
    if ('phone' in payload) changes.phone = payload.phone || null;
    if ('email' in payload) changes.email = payload.email || null;
    if ('partySize' in payload) changes.party_size = payload.partySize;
    if ('status' in payload) changes.status = payload.status;
    if ('notes' in payload) changes.notes = payload.notes || null;

    const guest = await guestRepository.updateByIdAndEventId(guestId, eventId, changes);

    await auditLogRepository.record({
      userId,
      action: 'guest.updated',
      entityType: 'guest',
      entityId: guestId,
      ipAddress: requestMeta?.ipAddress,
      userAgent: requestMeta?.userAgent,
    });

    return toGuestDTO(guest);
  },

  async remove(userId, eventId, guestId, requestMeta) {
    await assertEventOwnership(userId, eventId);
    await getOwnedGuestOrThrow(eventId, guestId);
    await guestRepository.deleteByIdAndEventId(guestId, eventId);

    await auditLogRepository.record({
      userId,
      action: 'guest.deleted',
      entityType: 'guest',
      entityId: guestId,
      ipAddress: requestMeta?.ipAddress,
      userAgent: requestMeta?.userAgent,
    });
  },

  async bulkRemove(userId, eventId, guestIds, requestMeta) {
    await assertEventOwnership(userId, eventId);
    const deleted = await guestRepository.deleteManyByEventId(eventId, guestIds);

    await auditLogRepository.record({
      userId,
      action: 'guest.deleted',
      entityType: 'guest',
      metadata: { bulk: true, count: deleted },
      ipAddress: requestMeta?.ipAddress,
      userAgent: requestMeta?.userAgent,
    });

    return deleted;
  },

  async bulkImport(userId, eventId, validGuests, requestMeta) {
    await assertEventOwnership(userId, eventId);
    await planService.assertCanAddGuest(userId, eventId, validGuests.length);
    const imported = await guestRepository.bulkCreate(eventId, validGuests);

    await auditLogRepository.record({
      userId,
      action: 'guest.created',
      entityType: 'guest',
      metadata: { bulkImport: true, imported },
      ipAddress: requestMeta?.ipAddress,
      userAgent: requestMeta?.userAgent,
    });

    return imported;
  },
};
