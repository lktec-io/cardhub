import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';
import { withTransaction } from '../utils/withTransaction.js';
import { escapeLike } from '../utils/escapeLike.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';
import { todayInTimezone, addDays, weekdayOf, DEFAULT_TIMEZONE } from '../utils/dateTime.js';
import { generateTicketCode, generateTicketToken, generateTicketOrderToken } from '../utils/ticketCode.js';
import { ticketEventRepository } from '../repositories/ticketEvent.repository.js';
import { ticketTypeRepository } from '../repositories/ticketType.repository.js';
import { ticketOrderRepository } from '../repositories/ticketOrder.repository.js';
import { ticketRepository } from '../repositories/ticket.repository.js';
import { paymentRepository } from '../repositories/payment.repository.js';
import { auditLogRepository } from '../repositories/auditLog.repository.js';
import { getTicketPaymentProvider, isTicketDemoMode, resolveNextAction } from './providers/paymentGateway.js';
import { demoPaymentProvider, DEMO_PROVIDER_NAME } from './providers/demoPaymentProvider.js';
import { PAYMENT_STATUS, PAYMENT_METHODS } from '../constants/paymentStatus.js';
import {
  TICKET_ORDER_STATUS,
  TICKET_ORDER_OPEN_STATUSES,
  TICKET_RESERVATION_MINUTES,
  TICKET_MAX_QUANTITY_PER_ORDER,
  TICKET_TYPE_STATUS,
  TICKET_PAYMENT_MODES,
  TICKET_STATUS,
} from '../constants/ticketStatus.js';
import { parseEventListQuery, isWellFormedTicketToken } from '../validators/tickets.validator.js';
import { toPublicEventListItemDTO, toPublicEventDetailDTO, toTicketOrderDTO, toPublicTicketDTO } from '../utils/serializeTicket.js';

const SWEEP_BATCH_SIZE = 50;
const CODE_COLLISION_RETRIES = 5;

function paymentMode() {
  return isTicketDemoMode() ? TICKET_PAYMENT_MODES.DEMO : TICKET_PAYMENT_MODES.LIVE;
}

function isOpen(order) {
  return TICKET_ORDER_OPEN_STATUSES.includes(order.status);
}

function hasLapsed(order) {
  return isOpen(order) && Number(order.seconds_left) <= 0;
}

function isEventPast(event) {
  return Boolean(event.event_date) && event.event_date < todayInTimezone(event.timezone || DEFAULT_TIMEZONE);
}

function soldOutError(message) {
  return new ApiError(409, 'SOLD_OUT', message);
}

function unavailableError(message) {
  return new ApiError(409, 'TICKET_UNAVAILABLE', message);
}

/** Server-side date presets in East Africa Time, so "this weekend" means the same thing for every visitor. */
function dateRangeFor(preset, today) {
  switch (preset) {
    case 'today':
      return { fromDate: today, toDate: today };
    case 'week':
      return { fromDate: today, toDate: addDays(today, 6) };
    case 'month':
      return { fromDate: today, toDate: addDays(today, 30) };
    case 'weekend': {
      const weekday = weekdayOf(today);
      if (weekday === 0) return { fromDate: today, toDate: today };
      const saturday = addDays(today, 6 - weekday);
      return { fromDate: saturday, toDate: addDays(saturday, 1) };
    }
    default:
      return { fromDate: today, toDate: null };
  }
}

/** Releases one lapsed reservation. Caller must hold the order's row lock and have checked it's still open. */
async function expireOrderInTx(order, conn) {
  await ticketOrderRepository.updateStatus(order.id, { status: TICKET_ORDER_STATUS.EXPIRED }, conn);
  await ticketTypeRepository.release(order.ticket_type_id, order.quantity, conn);
  await paymentRepository.closeOpenByTicketOrderId(
    order.id,
    { status: PAYMENT_STATUS.EXPIRED, failureReason: 'Reservation expired before payment was confirmed' },
    conn
  );
}

async function insertTicketWithRetry(order, seq, conn) {
  for (let attempt = 1; attempt <= CODE_COLLISION_RETRIES; attempt += 1) {
    try {
      await ticketRepository.create(
        {
          ticketOrderId: order.id,
          eventId: order.event_id,
          ticketTypeId: order.ticket_type_id,
          seq,
          ticketCode: generateTicketCode(),
          token: generateTicketToken(),
          holderName: order.buyer_name,
          holderPhone: order.buyer_phone,
          holderEmail: order.buyer_email,
          priceTzs: order.unit_price_tzs,
        },
        conn
      );
      return;
    } catch (error) {
      if (error.code !== 'ER_DUP_ENTRY') throw error;
      // This ticket already exists (a retried fulfilment), so it's done.
      if (String(error.message).includes('uq_tickets_order_seq')) return;
      // Otherwise a random code/token collided (astronomically unlikely). Draw again.
      if (attempt === CODE_COLLISION_RETRIES) throw error;
    }
  }
}

/**
 * The single place tickets are issued, for demo and real payments alike.
 * Caller must hold the order's row lock. Idempotent: an order that is
 * already paid is left as is, and tickets that already exist are skipped
 * (uq_tickets_order_seq).
 */
async function issueTicketsInTx(order, conn) {
  if (order.status === TICKET_ORDER_STATUS.PAID) return { issued: true, alreadyPaid: true };

  if (isOpen(order)) {
    await ticketTypeRepository.convertReservationToSale(order.ticket_type_id, order.quantity, conn);
  } else {
    // A verified payment for an order whose hold had already been released.
    const sold = await ticketTypeRepository.sellWithoutReservation(order.ticket_type_id, order.quantity, conn);
    if (!sold) return { issued: false, reason: 'sold_out' };
  }

  const existingSeqs = await ticketRepository.findSeqsByOrderId(order.id, conn);
  for (let seq = 1; seq <= Number(order.quantity); seq += 1) {
    if (!existingSeqs.has(seq)) await insertTicketWithRetry(order, seq, conn);
  }

  await ticketOrderRepository.updateStatus(order.id, { status: TICKET_ORDER_STATUS.PAID, paidAt: new Date() }, conn);
  return { issued: true, alreadyPaid: false };
}

async function buildOrderDTO(order) {
  const [event, ticketType, payment, tickets] = await Promise.all([
    ticketEventRepository.findById(order.event_id),
    ticketTypeRepository.findById(order.ticket_type_id),
    paymentRepository.findLatestByTicketOrderId(order.id),
    order.status === TICKET_ORDER_STATUS.PAID ? ticketRepository.findByOrderIdWithContext(order.id) : Promise.resolve([]),
  ]);
  return toTicketOrderDTO(order, { event, ticketType, payment, tickets, paymentMode: paymentMode() });
}

export const ticketsService = {
  getPaymentMode: paymentMode,

  async listEvents(query) {
    const filters = parseEventListQuery(query);
    const { page, limit, offset } = parsePagination(query);
    const range = dateRangeFor(filters.date, todayInTimezone());

    const { rows, total } = await ticketEventRepository.findAllPublic({
      ...range,
      search: filters.search ? escapeLike(filters.search) : '',
      location: filters.location ? escapeLike(filters.location) : '',
      category: filters.category,
      maxPrice: filters.maxPrice,
      limit,
      offset,
    });

    return {
      events: rows.map(toPublicEventListItemDTO),
      pagination: buildPaginationMeta({ page, limit, total }),
    };
  },

  async getEventBySlug(slug) {
    await this.expireLapsedReservations();

    const event = await ticketEventRepository.findPublicBySlug(slug);
    if (!event) throw ApiError.notFound('Event not found');

    const ticketTypes = await ticketTypeRepository.findByEventId(event.id);
    if (!ticketTypes.length) throw ApiError.notFound('Event not found');

    return { event: toPublicEventDetailDTO(event, ticketTypes, { isPast: isEventPast(event) }), paymentMode: paymentMode() };
  },

  /**
   * Reserves tickets and opens a pending order + payment row, all in one
   * transaction. The price comes only from the ticket type's database row.
   * Replaying the same idempotencyKey (double click, network retry,
   * refresh-and-resubmit) returns the original order instead of reserving twice.
   */
  async createOrder(input, requestMeta) {
    if (input.idempotencyKey) {
      const existing = await ticketOrderRepository.findByIdempotencyKey(input.idempotencyKey);
      if (existing) return this._replayOrder(existing, input);
    }

    await this.expireLapsedReservations();

    const event = await ticketEventRepository.findPublicBySlug(input.eventSlug);
    if (!event) throw ApiError.notFound('Event not found');
    if (isEventPast(event)) throw unavailableError('Ticket sales for this event have closed');

    const type = await ticketTypeRepository.findByIdAndEventId(input.ticketTypeId, event.id);
    if (!type || type.status !== TICKET_TYPE_STATUS.ACTIVE) throw unavailableError('This ticket type is not available');
    if (!Number(type.sales_started)) throw unavailableError(`${type.name} tickets are not on sale yet`);
    if (!Number(type.sales_not_ended)) throw unavailableError(`Sales for ${type.name} tickets have ended`);

    const remaining = Number(type.remaining);
    if (remaining <= 0) throw soldOutError(`${type.name} tickets are sold out`);

    const maxQuantity = Math.min(Number(type.max_per_order), TICKET_MAX_QUANTITY_PER_ORDER);
    if (input.quantity > maxQuantity) {
      throw ApiError.validation([{ field: 'quantity', message: `You can buy up to ${maxQuantity} ${type.name} tickets per order` }]);
    }
    if (input.quantity > remaining) {
      throw soldOutError(`Only ${remaining} ${type.name} ${remaining === 1 ? 'ticket is' : 'tickets are'} left`);
    }

    const unitPriceTzs = Number(type.price_tzs);
    const totalTzs = unitPriceTzs * input.quantity;
    const provider = getTicketPaymentProvider();

    let order;
    try {
      order = await withTransaction(async (conn) => {
        const reserved = await ticketTypeRepository.reserve(type.id, input.quantity, conn);
        // Someone else took the last tickets between the check above and now.
        if (!reserved) throw soldOutError(`Not enough ${type.name} tickets left for this order`);

        const created = await ticketOrderRepository.create(
          {
            publicToken: generateTicketOrderToken(),
            idempotencyKey: input.idempotencyKey,
            eventId: event.id,
            ticketTypeId: type.id,
            buyerName: input.buyerName,
            buyerPhone: input.buyerPhone,
            buyerEmail: input.buyerEmail,
            quantity: input.quantity,
            unitPriceTzs,
            totalTzs,
            reservationMinutes: TICKET_RESERVATION_MINUTES,
            isDemo: provider.isDemo === true,
          },
          conn
        );

        await paymentRepository.create(
          {
            ticketOrderId: created.id,
            amount: totalTzs,
            currency: 'TZS',
            method: PAYMENT_METHODS.MOBILE_MONEY,
            provider: provider.providerName,
            status: PAYMENT_STATUS.PENDING,
          },
          conn
        );
        return created;
      });
    } catch (error) {
      // Two identical requests raced past the first idempotency check. The loser returns the winner's order.
      if (error.code === 'ER_DUP_ENTRY' && input.idempotencyKey) {
        const existing = await ticketOrderRepository.findByIdempotencyKey(input.idempotencyKey);
        if (existing) return this._replayOrder(existing, input);
      }
      throw error;
    }

    // Ids and amounts only. The buyer's name/phone stay out of the audit log.
    await auditLogRepository.record({
      userId: null,
      action: 'ticket_order.created',
      entityType: 'ticket_order',
      entityId: order.id,
      metadata: { eventId: event.id, ticketTypeId: type.id, quantity: input.quantity, totalTzs, mode: paymentMode() },
      ipAddress: requestMeta?.ipAddress,
      userAgent: requestMeta?.userAgent,
    });

    return buildOrderDTO(order);
  },

  async _replayOrder(existing, input) {
    if (Number(existing.ticket_type_id) !== Number(input.ticketTypeId) || Number(existing.quantity) !== Number(input.quantity)) {
      throw ApiError.conflict('This checkout was already submitted with different details. Please refresh the page and try again.');
    }
    return buildOrderDTO(existing);
  },

  async getOrderByToken(token) {
    let order = await ticketOrderRepository.findByPublicToken(token);
    if (!order) throw ApiError.notFound('Order not found');

    if (hasLapsed(order)) {
      await withTransaction(async (conn) => {
        const locked = await ticketOrderRepository.findByIdForUpdate(order.id, conn);
        if (locked && hasLapsed(locked)) await expireOrderInTx(locked, conn);
      });
      order = await ticketOrderRepository.findById(order.id);
    }

    return buildOrderDTO(order);
  },

  /**
   * Starts (or resumes) the payment for an order. The order row lock makes
   * a double-tapped "Pay" button safe: the second request sees the
   * payment already in progress and gets the same next step back instead
   * of a second mobile-money prompt.
   */
  async startPayment(token, { phone }) {
    const provider = getTicketPaymentProvider();

    const outcome = await withTransaction(async (conn) => {
      const order = await ticketOrderRepository.findByPublicTokenForUpdate(token, conn);
      if (!order) throw ApiError.notFound('Order not found');

      if (hasLapsed(order)) {
        await expireOrderInTx(order, conn);
        return { orderId: order.id, nextAction: 'none' };
      }
      if (!isOpen(order)) return { orderId: order.id, nextAction: 'none' };

      let payment = await paymentRepository.findLatestByTicketOrderId(order.id, conn, { forUpdate: true });

      // Already in progress with the active provider. Don't start a second attempt.
      if (payment?.status === PAYMENT_STATUS.PROCESSING && payment.provider === provider.providerName && payment.provider_reference) {
        return { orderId: order.id, nextAction: resolveNextAction(provider, { status: 'created' }) };
      }

      // The payment mode changed since this order was opened: retire the old attempt, open one with the current provider.
      if (!payment || payment.status !== PAYMENT_STATUS.PENDING || payment.provider !== provider.providerName) {
        await paymentRepository.closeOpenByTicketOrderId(order.id, { status: PAYMENT_STATUS.CANCELLED, failureReason: 'Superseded by a new payment attempt' }, conn);
        payment = await paymentRepository.create(
          {
            ticketOrderId: order.id,
            amount: Number(order.total_tzs),
            currency: order.currency,
            method: PAYMENT_METHODS.MOBILE_MONEY,
            provider: provider.providerName,
            status: PAYMENT_STATUS.PENDING,
          },
          conn
        );
      }

      const providerResult = await provider.createPayment({
        amount: Number(order.total_tzs),
        currency: order.currency,
        orderId: `ticket-${order.id}`,
        reference: `ticket-${order.id}`,
        phone: phone || order.buyer_phone,
        description: 'CardHub event ticket',
      });

      if (providerResult.status === 'created' && providerResult.providerReference) {
        await paymentRepository.attachProviderReference(payment.id, providerResult.providerReference, conn);
        await paymentRepository.updateStatus(payment.id, { status: PAYMENT_STATUS.PROCESSING }, conn);
        await ticketOrderRepository.updateStatus(order.id, { status: TICKET_ORDER_STATUS.PROCESSING }, conn);
      }

      return { orderId: order.id, nextAction: resolveNextAction(provider, providerResult), checkoutUrl: providerResult.checkoutUrl || null };
    });

    const order = await ticketOrderRepository.findById(outcome.orderId);
    return {
      order: await buildOrderDTO(order),
      nextAction: outcome.nextAction,
      checkoutUrl: outcome.checkoutUrl || null,
      message:
        outcome.nextAction === 'unavailable'
          ? 'Online payment is not connected yet. Nothing has been charged. Please contact CardHub support to complete your purchase.'
          : undefined,
    };
  },

  /**
   * DEMO PAYMENT MODE ONLY. Marks a demo payment as paid and issues the
   * tickets. Refuses when the server isn't in demo mode, and refuses any
   * payment row that isn't a demo-provider row, so it can never settle a
   * real payment. Nothing PIN-related reaches this function: the demo PIN
   * is checked in the browser and never sent.
   */
  async confirmDemoPayment(token, requestMeta) {
    if (!isTicketDemoMode()) throw ApiError.forbidden('Demo payments are not enabled on this server');

    const outcome = await withTransaction(async (conn) => {
      const order = await ticketOrderRepository.findByPublicTokenForUpdate(token, conn);
      if (!order) throw ApiError.notFound('Order not found');

      if (order.status === TICKET_ORDER_STATUS.PAID) return { orderId: order.id, alreadyPaid: true };
      if (hasLapsed(order)) {
        await expireOrderInTx(order, conn);
        return { orderId: order.id, expired: true };
      }
      if (order.status === TICKET_ORDER_STATUS.PENDING) throw ApiError.conflict('Please start the payment first');
      if (order.status !== TICKET_ORDER_STATUS.PROCESSING) throw ApiError.conflict('This order can no longer be paid');

      const payment = await paymentRepository.findLatestByTicketOrderId(order.id, conn, { forUpdate: true });
      if (!payment || payment.provider !== DEMO_PROVIDER_NAME || payment.status !== PAYMENT_STATUS.PROCESSING) {
        throw ApiError.conflict('This payment cannot be confirmed in demo mode');
      }

      const confirmation = demoPaymentProvider.buildConfirmationEvent({ providerReference: payment.provider_reference, amount: payment.amount });
      if (Math.abs(confirmation.amount - Number(order.total_tzs)) > 0.5) {
        throw ApiError.badRequest('Payment amount does not match the order');
      }

      await paymentRepository.updateStatus(payment.id, { status: PAYMENT_STATUS.PAID, paidAt: new Date() }, conn);
      await issueTicketsInTx(order, conn);
      return { orderId: order.id, paymentId: payment.id };
    });

    if (outcome.paymentId) {
      await auditLogRepository.record({
        userId: null,
        action: 'ticket_order.demo_paid',
        entityType: 'ticket_order',
        entityId: outcome.orderId,
        metadata: { paymentId: outcome.paymentId, mode: TICKET_PAYMENT_MODES.DEMO },
        ipAddress: requestMeta?.ipAddress,
        userAgent: requestMeta?.userAgent,
      });
    }

    const order = await ticketOrderRepository.findById(outcome.orderId);
    return buildOrderDTO(order);
  },

  /**
   * Called by payment.service.js#handleProviderWebhook after it has
   * verified the webhook and marked the payment paid. This is the
   * production path to PAID. Safe to call repeatedly (webhook retries).
   */
  async fulfilFromVerifiedPayment(ticketOrderId) {
    const result = await withTransaction(async (conn) => {
      const order = await ticketOrderRepository.findByIdForUpdate(ticketOrderId, conn);
      if (!order) return { issued: false, reason: 'missing_order' };
      return issueTicketsInTx(order, conn);
    });

    if (!result.issued) {
      logger.error('Verified ticket payment could not be fulfilled — manual refund/review needed', { ticketOrderId, reason: result.reason });
      await auditLogRepository.record({
        userId: null,
        action: 'ticket_order.paid_not_fulfilled',
        entityType: 'ticket_order',
        entityId: ticketOrderId,
        metadata: { reason: result.reason },
      });
    }
    return result;
  },

  /** A verified provider "not successful" result: fail the order and return its tickets to sale. */
  async failFromProvider(ticketOrderId) {
    await withTransaction(async (conn) => {
      const order = await ticketOrderRepository.findByIdForUpdate(ticketOrderId, conn);
      if (!order || !isOpen(order)) return;
      await ticketOrderRepository.updateStatus(order.id, { status: TICKET_ORDER_STATUS.FAILED }, conn);
      await ticketTypeRepository.release(order.ticket_type_id, order.quantity, conn);
    });
  },

  /** Returns lapsed reservations to sale. Cheap (indexed, bounded batch) and never fails the calling request. */
  async expireLapsedReservations() {
    try {
      return await withTransaction(async (conn) => {
        const lapsed = await ticketOrderRepository.findLapsedOpenForUpdate(SWEEP_BATCH_SIZE, conn);
        for (const order of lapsed) await expireOrderInTx(order, conn);
        return lapsed.length;
      });
    } catch (error) {
      logger.warn('Ticket reservation sweep failed', { message: error.message });
      return 0;
    }
  },

  async getTicketByToken(token) {
    if (!isWellFormedTicketToken(token)) throw ApiError.notFound('Ticket not found');
    const row = await ticketRepository.findByTokenWithContext(token);
    if (!row || row.order_status !== TICKET_ORDER_STATUS.PAID) throw ApiError.notFound('Ticket not found');
    return toPublicTicketDTO(row);
  },

  /**
   * Door verification. Always answers 200 with VALID or INVALID. A
   * scanner needs a clear verdict, not an HTTP error to interpret. Only
   * what door staff need is returned.
   */
  async verifyTicket(token) {
    const invalid = (reason, extra = {}) => ({ result: 'INVALID', reason, ...extra });
    if (!isWellFormedTicketToken(token)) return invalid('NOT_FOUND');

    const row = await ticketRepository.findByTokenWithContext(token);
    if (!row) return invalid('NOT_FOUND');
    if (row.order_status !== TICKET_ORDER_STATUS.PAID) return invalid('NOT_PAID');

    const ticket = {
      ticketId: row.ticket_code,
      status: row.status,
      buyerName: row.holder_name,
      ticketType: row.ticket_type_name,
      isDemo: Boolean(Number(row.is_demo)),
      checkedInAt: row.checked_in_at,
      event: {
        title: row.event_title,
        date: row.event_date,
        startTime: row.event_time ? String(row.event_time).slice(0, 5) : null,
        venue: row.venue_name,
      },
    };

    if (row.status === TICKET_STATUS.CANCELLED) return invalid('CANCELLED', { ticket });
    if (row.status === TICKET_STATUS.USED) return invalid('ALREADY_USED', { ticket });
    return { result: 'VALID', ticket };
  },
};
