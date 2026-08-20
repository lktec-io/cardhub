import { randomBytes } from 'node:crypto';
import { ApiError } from '../utils/ApiError.js';
import { orderRepository } from '../repositories/order.repository.js';
import { templateRepository } from '../repositories/template.repository.js';
import { auditLogRepository } from '../repositories/auditLog.repository.js';
import { deliveryService } from './delivery.service.js';
import { getPricingTier, DEFAULT_PRICING_TIER } from '../constants/pricingTiers.js';
import { ORDER_SOURCE, DELIVERY_STATUS } from '../constants/orderStatus.js';
import { RSVP_STATUS } from '../constants/rsvpStatus.js';
import { toOrderDTO, toPublicOrderCardDTO } from '../utils/serializeOrder.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';
import { generateRsvpCode } from '../utils/rsvpCode.js';

const MAX_RSVP_CODE_ATTEMPTS = 5;

/**
 * The "an order must belong to a real user OR carry guest contact info"
 * rule cannot be a MySQL CHECK constraint here — user_id already carries
 * an ON DELETE SET NULL referential action (fk_orders_user in migration
 * 016), and MySQL 8 rejects a column driven by a referential action also
 * being part of a CHECK (error 3823: the SET NULL could otherwise put an
 * existing row in violation outside of normal DML). So this is the one
 * place that rule is actually enforced — called before every order is
 * created, regardless of source.
 */
export function assertHasContact({ userId, guestName, guestPhone }) {
  const hasUser = userId !== null && userId !== undefined;
  const hasGuestContact = Boolean(guestName) && Boolean(guestPhone);
  if (!hasUser && !hasGuestContact) {
    throw ApiError.badRequest('An order needs either a signed-in customer or a guest name and phone number');
  }
}

/** Unguessable, URL-safe — same reasoning as utils/slugify.js's uniqueSlug, just longer (this is the whole identifier, not a suffix). */
export function generatePublicToken() {
  return randomBytes(18).toString('base64url');
}

/**
 * Creates the order with a fresh human-friendly rsvp_code, retrying with
 * a new code only on a genuine rsvp_code collision (extremely unlikely —
 * see utils/rsvpCode.js's entropy note) rather than masking any other
 * insert failure. Exported so payment.service.js's paid checkout flow
 * reuses the exact same order-creation path as Try Our Service instead
 * of a second, parallel implementation.
 */
export async function createOrderWithUniqueRsvpCode(fields) {
  for (let attempt = 1; attempt <= MAX_RSVP_CODE_ATTEMPTS; attempt += 1) {
    try {
      return await orderRepository.create({ ...fields, rsvpCode: generateRsvpCode() });
    } catch (error) {
      const isRsvpCodeCollision = error.code === 'ER_DUP_ENTRY' && String(error.sqlMessage || '').includes('rsvp_code');
      if (!isRsvpCodeCollision || attempt === MAX_RSVP_CODE_ATTEMPTS) throw error;
    }
  }
  throw ApiError.internal('Could not generate a unique invitation link — please try again');
}

/** Turns the delivery.service.js result into the exact human sentence the customer sees — see docs/architecture.md "Try Our Service delivery". */
export function buildDeliveryMessage({ overallStatus, channels }) {
  const wantsBoth = channels.includes('sms') && channels.includes('whatsapp');

  if (overallStatus === DELIVERY_STATUS.SENT) {
    return wantsBoth
      ? 'Your card has been sent via WhatsApp and SMS.'
      : `Your card has been sent via ${channels[0] === 'whatsapp' ? 'WhatsApp' : 'SMS'}.`;
  }
  if (overallStatus === DELIVERY_STATUS.PARTIALLY_SENT) {
    return 'One of your delivery methods worked, but the other could not be sent right now. Our team can follow up.';
  }
  if (overallStatus === DELIVERY_STATUS.FAILED) {
    return "We couldn't send your card automatically right now, but your request is saved — our team will follow up.";
  }
  return 'Your request has been saved.';
}

export const ordersService = {
  /**
   * Public, unauthenticated — the /try conversion flow. Creates the order
   * first (always succeeds as a real, persisted request regardless of
   * what happens next), then attempts delivery through every requested
   * channel and persists the honest, provider-reported result. Never
   * marks a channel "sent" unless its provider actually accepted it. The
   * unit price always comes from the template's own pricing tier,
   * computed here — a client-supplied price or tier is never trusted,
   * and neither is a client-supplied image/card URL (see
   * services/delivery.service.js + utils/publicUrl.js, which resolve
   * both server-side from the already-resolved template).
   */
  async submitTryService(
    { name, phone, templateId, quantity, channels, eventType, eventName, venue, eventDate, eventTime, guestType },
    requestMeta
  ) {
    const template = await templateRepository.findActiveById(templateId);
    if (!template) {
      throw ApiError.badRequest('The selected card is not available');
    }

    const tier = getPricingTier(template.pricing_tier || DEFAULT_PRICING_TIER);
    const qty = Number(quantity) || 1;
    const unitPriceTzs = tier.priceTzs;
    const subtotalTzs = unitPriceTzs * qty;

    const guestName = name.trim();
    const guestPhone = phone; // already E.164-normalized by validateTryServicePayload
    assertHasContact({ userId: null, guestName, guestPhone });

    let order = await createOrderWithUniqueRsvpCode({
      userId: null,
      templateId: template.id,
      guestName,
      guestPhone,
      pricingTier: tier.id,
      unitPriceTzs,
      quantity: qty,
      subtotalTzs,
      source: ORDER_SOURCE.TRY_SERVICE,
      notes: null,
      publicToken: generatePublicToken(),
      eventType,
      eventName,
      venue,
      eventDate,
      eventTime,
      guestType,
    });

    await auditLogRepository.record({
      userId: null,
      action: 'order.try_service_submitted',
      entityType: 'order',
      entityId: order.id,
      metadata: { templateId: template.id, pricingTier: tier.id, quantity: qty, channels },
      ipAddress: requestMeta?.ipAddress,
      userAgent: requestMeta?.userAgent,
    });

    // Mark as in-progress before dispatching — if the process dies
    // mid-delivery, the order is visibly "processing" (needs manual
    // admin attention) rather than misleadingly still "pending".
    await orderRepository.updateStatusFields(order.id, { deliveryStatus: DELIVERY_STATUS.PROCESSING });

    const deliveryResult = await deliveryService.deliverOrder({ order, template, channels, requestMeta });

    order = await orderRepository.updateDeliveryResult(order.id, {
      deliveryStatus: deliveryResult.overallStatus,
      smsStatus: deliveryResult.smsStatus,
      smsProviderMessageId: deliveryResult.smsProviderMessageId,
      smsError: deliveryResult.smsError,
      whatsappStatus: deliveryResult.whatsappStatus,
      whatsappProviderMessageId: deliveryResult.whatsappProviderMessageId,
      whatsappError: deliveryResult.whatsappError,
    });

    return {
      order: toOrderDTO(order),
      deliveryMessage: buildDeliveryMessage({ overallStatus: deliveryResult.overallStatus, channels }),
    };
  },

  async listMine(userId, { page, limit }) {
    const pagination = parsePagination({ page, limit });
    const { rows, total } = await orderRepository.findAllByUserId({
      userId,
      limit: pagination.limit,
      offset: pagination.offset,
    });

    return {
      orders: rows.map(toOrderDTO),
      pagination: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, total }),
    };
  },

  async getMine(userId, id) {
    const order = await orderRepository.findByIdAndUserId(id, userId);
    if (!order) throw ApiError.notFound('Order not found');
    return toOrderDTO(order);
  },

  /** Public — the order confirmation page reached via the SMS/WhatsApp link. Keyed by the unguessable public_token, never the sequential id. */
  async getByPublicToken(token) {
    const order = await orderRepository.findByPublicToken(token);
    if (!order) throw ApiError.notFound('Card not found');
    return toPublicOrderCardDTO(order);
  },

  /** Public — the guest's own attendance response, submitted from the order-card page. Same anonymous-lookup rule as getByPublicToken. */
  async submitRsvp(token, status, requestMeta) {
    const order = await orderRepository.findByPublicToken(token);
    if (!order) throw ApiError.notFound('Card not found');

    const updated = await orderRepository.updateRsvpStatus(order.id, status);

    await auditLogRepository.record({
      userId: order.user_id ?? null,
      action: 'order.rsvp_submitted',
      entityType: 'order',
      entityId: order.id,
      metadata: { status },
      ipAddress: requestMeta?.ipAddress,
      userAgent: requestMeta?.userAgent,
    });

    return {
      order: toPublicOrderCardDTO(updated),
      message: status === RSVP_STATUS.ATTENDING ? "Thank you — we can't wait to celebrate with you!" : 'Thank you for letting us know.',
    };
  },
};
