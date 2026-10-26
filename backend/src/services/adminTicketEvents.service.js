import { ApiError } from '../utils/ApiError.js';
import { uniqueSlug } from '../utils/slugify.js';
import { escapeLike } from '../utils/escapeLike.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';
import { buildDefaultInvitationConfig } from '../utils/defaultInvitationConfig.js';
import { maskPhone } from '../utils/serializeTicket.js';
import { eventRepository } from '../repositories/event.repository.js';
import { templateRepository } from '../repositories/template.repository.js';
import { ticketOrderRepository } from '../repositories/ticketOrder.repository.js';
import { ticketRepository } from '../repositories/ticket.repository.js';
import { auditLogRepository } from '../repositories/auditLog.repository.js';
import { eventTicketsService } from './eventTickets.service.js';
import { mediaStorage, resolveMediaUrl } from './providers/mediaStorage.js';
import { saveOrRollback } from './adminContent.service.js';
import { TICKET_ORDER_STATUS } from '../constants/ticketStatus.js';

const toHHMM = (time) => (time ? String(time).slice(0, 5) : null);

function toAdminEventDTO(row) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    status: row.status,
    eventType: row.event_type,
    eventDate: row.event_date,
    eventTime: toHHMM(row.event_time),
    endTime: toHHMM(row.end_time),
    venueName: row.venue_name,
    venueAddress: row.venue_address,
    description: row.description,
    hostName: row.host_name,
    organizerContact: row.organizer_contact,
    coverImage: row.cover_image,
    coverImageUrl: resolveMediaUrl(row.cover_image),
    ticketSalesEnabled: Boolean(Number(row.ticket_sales_enabled)),
    ownerName: row.owner_name,
    createdAt: row.created_at,
  };
}

function toListItemDTO(row) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    status: row.status,
    eventType: row.event_type,
    eventDate: row.event_date,
    eventTime: toHHMM(row.event_time),
    venueName: row.venue_name,
    coverImageUrl: resolveMediaUrl(row.cover_image),
    ticketSalesEnabled: Boolean(Number(row.ticket_sales_enabled)),
    isLive: Boolean(Number(row.ticket_sales_enabled)) && row.status === 'published',
    ownerName: row.owner_name,
    tierCount: Number(row.tier_count),
    allocated: Number(row.allocated),
    sold: Number(row.sold),
    reserved: Number(row.reserved),
    revenueTzs: Number(row.revenue_tzs),
    demoRevenueTzs: Number(row.demo_revenue_tzs),
  };
}

async function getEventOrThrow(id) {
  const event = await eventRepository.findByIdAny(id);
  if (!event) throw ApiError.notFound('Event not found');
  return event;
}

async function audit(adminUserId, action, entityId, metadata, requestMeta) {
  await auditLogRepository.record({
    userId: adminUserId,
    action,
    entityType: 'event',
    entityId,
    metadata,
    ipAddress: requestMeta?.ipAddress,
    userAgent: requestMeta?.userAgent,
  });
}

/**
 * Admin portal → Events & tickets. Admin-created events are owned by the
 * creating admin's account (events.user_id is required) and use the first
 * active card design (events.template_id is required; it only matters if
 * the event is ever used as an invitation too).
 */
export const adminTicketEventsService = {
  async list(query) {
    const { page, limit, offset } = parsePagination(query);
    const search = typeof query.search === 'string' ? query.search.trim().slice(0, 100) : '';
    const { rows, total } = await eventRepository.findAllTicketingAdmin({
      search: search ? escapeLike(search) : '',
      scope: query.scope === 'all' ? 'all' : 'ticketing',
      limit,
      offset,
    });
    return { events: rows.map(toListItemDTO), pagination: buildPaginationMeta({ page, limit, total }) };
  },

  async create(details, adminUserId, requestMeta) {
    const { rows: templates } = await templateRepository.findActivePaginated({ limit: 1, offset: 0 });
    if (!templates.length) throw ApiError.conflict('Publish at least one invitation card first — every event needs a card design.');

    let slug = uniqueSlug(details.title);
    while (await eventRepository.slugExists(slug)) slug = uniqueSlug(details.title);

    const created = await eventRepository.create({
      userId: adminUserId,
      templateId: templates[0].id,
      title: details.title,
      eventType: details.eventType,
      slug,
      eventDate: details.eventDate,
      eventTime: details.eventTime,
      timezone: 'Africa/Dar_es_Salaam',
      venueName: details.venueName,
      venueAddress: details.venueAddress,
      description: details.description,
      hostName: details.hostName,
      invitationConfig: buildDefaultInvitationConfig(),
    });
    const row = await eventRepository.updateDetailsById(created.id, details);
    await audit(adminUserId, 'admin.event_created', row.id, { title: row.title }, requestMeta);
    return this.get(row.id);
  },

  async get(id) {
    const event = await getEventOrThrow(id);
    return { event: toAdminEventDTO(event), tickets: await eventTicketsService.getForAdmin(id) };
  },

  async updateDetails(id, details, adminUserId, requestMeta) {
    await getEventOrThrow(id);
    await eventRepository.updateDetailsById(id, details);
    await audit(adminUserId, 'admin.event_updated', id, { title: details.title }, requestMeta);
    return this.get(id);
  },

  async uploadPoster(id, file, adminUserId, requestMeta) {
    const event = await getEventOrThrow(id);
    if (!file) throw ApiError.validation([{ field: 'image', message: 'Choose a poster image' }]);
    const stored = await mediaStorage.commit(file.path, { kind: 'image', folder: 'posters' });
    await saveOrRollback(stored.key, () => eventRepository.updateCoverById(id, stored.key));
    await mediaStorage.removeIfUnreferenced(event.cover_image);
    await audit(adminUserId, 'admin.event_poster_uploaded', id, {}, requestMeta);
    return this.get(id);
  },

  async setPublished(id, published, adminUserId, requestMeta) {
    const event = await getEventOrThrow(id);
    if (published) {
      const details = [];
      if (!event.title?.trim()) details.push({ field: 'title', message: 'Add a title before publishing' });
      if (!event.event_date) details.push({ field: 'eventDate', message: 'Add the event date before publishing' });
      if (!event.venue_name) details.push({ field: 'venueName', message: 'Add the venue before publishing' });
      if (details.length) throw ApiError.validation(details, 'This event isn’t ready to publish yet');
    }
    await eventRepository.setPublishedById(id, published);
    await audit(adminUserId, published ? 'admin.event_published' : 'admin.event_unpublished', id, {}, requestMeta);
    return this.get(id);
  },

  async saveTickets(id, input, adminUserId, requestMeta) {
    return eventTicketsService.saveForAdmin(adminUserId, id, input, requestMeta);
  },

  async listOrders(id, query) {
    await getEventOrThrow(id);
    const { page, limit, offset } = parsePagination(query);
    const status = Object.values(TICKET_ORDER_STATUS).includes(query.status) ? query.status : '';
    const { rows, total } = await ticketOrderRepository.findByEventForAdmin(id, { status, limit, offset });
    return {
      orders: rows.map((row) => ({
        id: row.id,
        reference: `TKT-${row.id}`,
        status: row.status,
        isDemo: Boolean(Number(row.is_demo)),
        buyerName: row.buyer_name,
        buyerPhone: row.buyer_phone,
        buyerEmail: row.buyer_email,
        ticketType: row.ticket_type_name,
        quantity: Number(row.quantity),
        totalTzs: Number(row.total_tzs),
        paymentStatus: row.payment_status,
        paymentProvider: row.payment_provider,
        createdAt: row.created_at,
        paidAt: row.paid_at,
      })),
      pagination: buildPaginationMeta({ page, limit, total }),
    };
  },

  async listTickets(id, query) {
    await getEventOrThrow(id);
    const { page, limit, offset } = parsePagination(query);
    const search = typeof query.search === 'string' ? query.search.trim().slice(0, 60) : '';
    const { rows, total } = await ticketRepository.findByEventForAdmin(id, { search: search ? escapeLike(search) : '', limit, offset });
    return {
      tickets: rows.map((row) => ({
        id: row.id,
        ticketId: row.ticket_code,
        holderName: row.holder_name,
        holderPhone: maskPhone(row.holder_phone),
        ticketType: row.ticket_type_name,
        priceTzs: Number(row.price_tzs),
        status: row.status,
        checkedInAt: row.checked_in_at,
        isDemo: Boolean(Number(row.is_demo)),
        issuedAt: row.created_at,
      })),
      pagination: buildPaginationMeta({ page, limit, total }),
    };
  },
};
