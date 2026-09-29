import { ApiError } from '../utils/ApiError.js';
import { withTransaction } from '../utils/withTransaction.js';
import { eventRepository } from '../repositories/event.repository.js';
import { ticketTypeRepository } from '../repositories/ticketType.repository.js';
import { ticketOrderRepository } from '../repositories/ticketOrder.repository.js';
import { auditLogRepository } from '../repositories/auditLog.repository.js';
import { imageStorageProvider } from './providers/imageStorageProvider.js';
import { TICKET_TYPE_STATUS } from '../constants/ticketStatus.js';
import { EVENT_STATUS } from '../constants/eventStatus.js';

function toHHMM(time) {
  return time ? String(time).slice(0, 5) : null;
}

function toTierDTO(row) {
  const sold = Number(row.quantity_sold);
  const reserved = Number(row.quantity_reserved);
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    priceTzs: Number(row.price_tzs),
    quantityAvailable: Number(row.quantity_available),
    quantitySold: sold,
    quantityReserved: reserved,
    remaining: Math.max(Number(row.quantity_available) - sold - reserved, 0),
    maxPerOrder: Number(row.max_per_order),
    status: row.status,
    // A tier with orders can be paused but never deleted: its tickets must stay valid.
    hasOrders: Number(row.order_count) > 0,
  };
}

async function getOwnedEventOrThrow(userId, eventId) {
  const event = await eventRepository.findByIdAndUserId(eventId, userId);
  if (!event) throw ApiError.notFound('Event not found');
  return event;
}

async function buildManagementDTO(event) {
  const [tierRows, salesRow] = await Promise.all([
    ticketTypeRepository.findAllForManagement(event.id),
    ticketOrderRepository.getEventSalesStats(event.id),
  ]);
  const tiers = tierRows.map(toTierDTO);
  const sum = (key) => tiers.reduce((total, tier) => total + tier[key], 0);

  return {
    event: {
      id: event.id,
      title: event.title,
      status: event.status,
      slug: event.slug,
      eventDate: event.event_date,
      startTime: toHHMM(event.event_time),
      endTime: toHHMM(event.end_time),
      coverImage: event.cover_image,
      organizerContact: event.organizer_contact,
      ticketSalesEnabled: Boolean(Number(event.ticket_sales_enabled)),
      isLive: Boolean(Number(event.ticket_sales_enabled)) && event.status === EVENT_STATUS.PUBLISHED,
    },
    tiers,
    stats: {
      allocated: sum('quantityAvailable'),
      sold: sum('quantitySold'),
      reserved: sum('quantityReserved'),
      remaining: sum('remaining'),
      paidOrders: Number(salesRow.paid_orders),
      revenueTzs: Number(salesRow.revenue_tzs),
      demoRevenueTzs: Number(salesRow.demo_revenue_tzs),
    },
    // Lets the form say honestly whether direct image upload works on this server.
    imageUploadsAvailable: imageStorageProvider.isConfigured,
  };
}

/**
 * Event Workspace → Tickets. Organizer-owned management of one event's
 * ticket setup. Every read and write is scoped to the authenticated
 * owner (findByIdAndUserId), exactly like the rest of /events.
 */
export const eventTicketsService = {
  async getForOwner(userId, eventId) {
    const event = await getOwnedEventOrThrow(userId, eventId);
    return buildManagementDTO(event);
  },

  /**
   * Applies the whole ticket setup in one transaction, with the event's
   * tiers row-locked so a checkout happening at the same moment can't
   * move sold/reserved counts underneath the validation:
   *   - a tier's quantity can never drop below what's sold + held
   *   - a removed tier with orders is paused (hidden from sale), not deleted
   *   - sales can only be switched on with at least one active tier and an event date
   */
  async saveForOwner(userId, eventId, input, requestMeta) {
    const event = await getOwnedEventOrThrow(userId, eventId);

    const activeTiers = input.tiers.filter((tier) => tier.status === TICKET_TYPE_STATUS.ACTIVE);
    if (input.ticketSalesEnabled) {
      const details = [];
      if (!activeTiers.length) details.push({ field: 'tiers', message: 'Add at least one active ticket tier before switching sales on' });
      if (!event.event_date) details.push({ field: 'ticketSalesEnabled', message: 'Set the event date in Settings before switching sales on' });
      if (details.length) throw ApiError.validation(details, 'Ticket sales can’t be switched on yet');
    }

    try {
      await withTransaction(async (conn) => {
        const existing = await ticketTypeRepository.lockAllForEvent(event.id, conn);
        const byId = new Map(existing.map((row) => [row.id, row]));
        const keptIds = new Set();
        const details = [];

        input.tiers.forEach((tier, index) => {
          if (tier.id === null) return;
          const current = byId.get(tier.id);
          if (!current) {
            details.push({ field: `tiers.${index}.id`, message: 'This tier no longer exists. Refresh the page.' });
            return;
          }
          keptIds.add(tier.id);
          const committed = Number(current.quantity_sold) + Number(current.quantity_reserved);
          if (tier.quantityAvailable < committed) {
            details.push({
              field: `tiers.${index}.quantityAvailable`,
              message: `At least ${committed} — that many are already sold or being paid for`,
            });
          }
        });
        if (details.length) throw ApiError.validation(details);

        // Removed tiers first (frees their names for re-use), then updates, then new tiers.
        for (const row of existing) {
          if (keptIds.has(row.id)) continue;
          if (Number(row.order_count) > 0) await ticketTypeRepository.setStatusForEvent(row.id, event.id, TICKET_TYPE_STATUS.INACTIVE, conn);
          else await ticketTypeRepository.deleteForEvent(row.id, event.id, conn);
        }
        for (const tier of input.tiers) {
          if (tier.id !== null) await ticketTypeRepository.updateForEvent(tier.id, event.id, tier, conn);
        }
        for (const tier of input.tiers) {
          if (tier.id === null) await ticketTypeRepository.insert({ ...tier, eventId: event.id }, conn);
        }

        await eventRepository.updateTicketSettingsByIdAndUserId(
          event.id,
          userId,
          {
            ticketSalesEnabled: input.ticketSalesEnabled,
            coverImage: input.coverImage,
            organizerContact: input.organizerContact,
            endTime: input.endTime,
          },
          conn
        );
      });
    } catch (error) {
      // A paused tier with orders still owns its name (unique per event).
      if (error.code === 'ER_DUP_ENTRY') {
        throw ApiError.conflict('Another tier (possibly a paused one with past orders) already uses one of these names. Choose a different name.');
      }
      throw error;
    }

    await auditLogRepository.record({
      userId,
      action: 'event.tickets_updated',
      entityType: 'event',
      entityId: event.id,
      metadata: { ticketSalesEnabled: input.ticketSalesEnabled, tiers: input.tiers.length, activeTiers: activeTiers.length },
      ipAddress: requestMeta?.ipAddress,
      userAgent: requestMeta?.userAgent,
    });

    const updated = await getOwnedEventOrThrow(userId, eventId);
    return buildManagementDTO(updated);
  },
};
