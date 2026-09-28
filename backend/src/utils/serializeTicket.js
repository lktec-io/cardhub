import { getPublicTicketUrl, getTicketVerifyUrl } from './publicUrl.js';

/**
 * Public DTOs for the ticket marketplace. Like serializeEvent.js#toPublicInvitationDTO,
 * each one is built field by field and never spreads a DB row, so a column
 * added later can't leak into an anonymous response by accident. Internal
 * ids (event id, order id, user id) are never included. The one exception is
 * the ticket type id, which the checkout needs to say which type was picked.
 */

// Show a count only when it helps the buyer decide ("Only 8 left").
// Exact inventory above that stays the organizer's business.
const LOW_STOCK_THRESHOLD = 20;

function toHHMM(time) {
  return time ? String(time).slice(0, 5) : null;
}

/** Cover images are only ever a root-relative app asset or an http(s) URL — never a data:/javascript: URI. */
function safeCover(value) {
  if (typeof value !== 'string' || !value) return null;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  return /^https?:\/\//i.test(value) ? value : null;
}

/** '+255794987520' -> '0794 *** 520'. A shared ticket link must not reveal the buyer's full number. */
export function maskPhone(phone) {
  if (!phone) return null;
  const local = phone.startsWith('+255') ? `0${phone.slice(4)}` : phone;
  if (local.length < 7) return '***';
  return `${local.slice(0, 4)} *** ${local.slice(-3)}`;
}

function toEventSummary(row) {
  return {
    slug: row.event_slug ?? row.slug,
    title: row.event_title ?? row.title,
    category: row.event_type,
    date: row.event_date,
    startTime: toHHMM(row.event_time),
    endTime: toHHMM(row.end_time),
    timezone: row.timezone,
    venue: { name: row.venue_name, address: row.venue_address },
    coverImage: safeCover(row.cover_image),
    organizer: row.host_name ? { name: row.host_name, contact: row.organizer_contact || null } : null,
  };
}

function ticketTypeAvailability(row) {
  if (!Number(row.sales_started)) return 'not_started';
  if (!Number(row.sales_not_ended)) return 'ended';
  const remaining = Number(row.remaining);
  if (remaining <= 0) return 'sold_out';
  if (remaining <= LOW_STOCK_THRESHOLD) return 'low';
  return 'available';
}

export function toPublicTicketTypeDTO(row) {
  const availability = ticketTypeAvailability(row);
  const remaining = Number(row.remaining);
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    priceTzs: Number(row.price_tzs),
    currency: 'TZS',
    availability,
    remaining: availability === 'low' ? remaining : null,
    // What the quantity picker may offer — never more than what's actually left.
    maxPerOrder: Math.max(0, Math.min(Number(row.max_per_order), remaining)),
    salesStart: row.sales_start,
    salesEnd: row.sales_end,
  };
}

/** Marketplace card. */
export function toPublicEventListItemDTO(row) {
  return {
    ...toEventSummary(row),
    description: row.description,
    startingPriceTzs: row.min_price_tzs !== null ? Number(row.min_price_tzs) : null,
    soldOut: Number(row.tickets_remaining) <= 0,
  };
}

/** Event detail page. `isPast` is computed by the service in the event's own timezone. */
export function toPublicEventDetailDTO(row, ticketTypeRows, { isPast }) {
  const ticketTypes = ticketTypeRows.map(toPublicTicketTypeDTO);
  const prices = ticketTypes.map((type) => type.priceTzs);
  return {
    ...toEventSummary(row),
    description: row.description,
    startingPriceTzs: prices.length ? Math.min(...prices) : null,
    salesOpen: !isPast && ticketTypes.some((type) => type.availability === 'available' || type.availability === 'low'),
    isPast,
    ticketTypes,
  };
}

/**
 * One admission. `qrPayload` is a verification URL carrying only the
 * random token, so a photo of the QR reveals nothing about the buyer.
 */
export function toPublicTicketDTO(row) {
  return {
    ticketId: row.ticket_code,
    token: row.token,
    seq: row.seq,
    status: row.status,
    paymentStatus: row.order_status,
    isDemo: Boolean(Number(row.is_demo)),
    holderName: row.holder_name,
    holderPhone: maskPhone(row.holder_phone),
    ticketType: { name: row.ticket_type_name },
    pricePaidTzs: Number(row.price_tzs),
    currency: row.currency || 'TZS',
    issuedAt: row.created_at,
    checkedInAt: row.checked_in_at,
    qrPayload: getTicketVerifyUrl(row.token),
    shareUrl: getPublicTicketUrl(row.token),
    event: toEventSummary(row),
  };
}

/**
 * The buyer's own order view, reached only with the order's private
 * public_token. This one shows the buyer's full phone and email because
 * the only person holding that token is the buyer.
 */
export function toTicketOrderDTO(order, { event, ticketType, payment, tickets, paymentMode }) {
  return {
    token: order.public_token,
    status: order.status,
    isDemo: Boolean(Number(order.is_demo)),
    paymentMode,
    buyer: { name: order.buyer_name, phone: order.buyer_phone, email: order.buyer_email },
    quantity: Number(order.quantity),
    unitPriceTzs: Number(order.unit_price_tzs),
    totalTzs: Number(order.total_tzs),
    currency: order.currency,
    reservationSecondsLeft: ['pending', 'processing'].includes(order.status) ? Number(order.seconds_left) : 0,
    createdAt: order.created_at,
    paidAt: order.paid_at,
    event: event ? toEventSummary(event) : null,
    ticketType: ticketType ? { id: ticketType.id, name: ticketType.name } : null,
    payment: payment
      ? { status: payment.status, provider: payment.provider, method: payment.method, failureReason: payment.failure_reason }
      : null,
    tickets: (tickets || []).map(toPublicTicketDTO),
  };
}
