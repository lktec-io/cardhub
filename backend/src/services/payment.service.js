import { ApiError } from '../utils/ApiError.js';
import { orderRepository } from '../repositories/order.repository.js';
import { paymentRepository } from '../repositories/payment.repository.js';
import { templateRepository } from '../repositories/template.repository.js';
import { auditLogRepository } from '../repositories/auditLog.repository.js';
import { paymentProvider } from './providers/paymentProvider.js';
import { deliveryService } from './delivery.service.js';
import { getPricingTier, DEFAULT_PRICING_TIER } from '../constants/pricingTiers.js';
import { ORDER_SOURCE, ORDER_STATUS, PAYMENT_STATUS as ORDER_PAYMENT_STATUS, DELIVERY_STATUS, DELIVERY_CHANNEL_VALUES } from '../constants/orderStatus.js';
import { PAYMENT_STATUS, canTransition } from '../constants/paymentStatus.js';
import { toOrderDTO } from '../utils/serializeOrder.js';
import { assertHasContact, generatePublicToken, createOrderWithUniqueRsvpCode, buildDeliveryMessage } from './orders.service.js';

function toPaymentDTO(payment) {
  if (!payment) return null;
  return {
    id: payment.id,
    orderId: payment.order_id,
    amount: Number(payment.amount),
    currency: payment.currency,
    method: payment.method,
    provider: payment.provider,
    status: payment.status,
    failureReason: payment.failure_reason,
    createdAt: payment.created_at,
    paidAt: payment.paid_at,
    // Deliberately never includes provider_reference or the raw provider
    // payload — those are internal reconciliation details, not something
    // a customer-facing screen needs.
  };
}

export const paymentService = {
  /**
   * Creates a real order (source: 'catalogue_purchase') exactly the way
   * Try Our Service does — same validated fields, same server-computed
   * price from the template's pricing tier, same unguessable rsvp_code —
   * then a linked, pending payment row, then asks the provider to start
   * a real checkout. The order always exists after this call regardless
   * of what the provider does; nothing is ever marked "paid" here.
   */
  async initiateCheckout(
    { name, phone, templateId, quantity, eventType, eventName, venue, eventDate, eventTime, guestType, method },
    requestMeta
  ) {
    const template = await templateRepository.findActiveById(templateId);
    if (!template) {
      throw ApiError.badRequest('The selected card is not available');
    }

    // The one and only place the price is computed — never accepted from the client.
    const tier = getPricingTier(template.pricing_tier || DEFAULT_PRICING_TIER);
    const qty = Number(quantity) || 1;
    const unitPriceTzs = tier.priceTzs;
    const subtotalTzs = unitPriceTzs * qty;

    const guestName = name.trim();
    const guestPhone = phone;
    assertHasContact({ userId: null, guestName, guestPhone });

    const order = await createOrderWithUniqueRsvpCode({
      userId: null,
      templateId: template.id,
      guestName,
      guestPhone,
      pricingTier: tier.id,
      unitPriceTzs,
      quantity: qty,
      subtotalTzs,
      source: ORDER_SOURCE.DASHBOARD, // "a real purchase," distinct from the free try_service lead-gen source
      notes: null,
      publicToken: generatePublicToken(),
      eventType,
      eventName,
      venue,
      eventDate,
      eventTime,
      guestType,
    });

    const payment = await paymentRepository.create({
      orderId: order.id,
      userId: null,
      subscriptionId: null,
      amount: subtotalTzs,
      currency: 'TZS',
      method,
      provider: paymentProvider.providerName,
      status: PAYMENT_STATUS.PENDING,
    });

    await auditLogRepository.record({
      userId: null,
      action: 'payment.checkout_initiated',
      entityType: 'payment',
      entityId: payment.id,
      metadata: { orderId: order.id, amount: subtotalTzs, currency: 'TZS', method },
      ipAddress: requestMeta?.ipAddress,
      userAgent: requestMeta?.userAgent,
    });

    const providerResult = await paymentProvider.createPayment({
      amount: subtotalTzs,
      currency: 'TZS',
      orderId: order.id,
      phone: guestPhone,
      description: `CardHub — ${template.name}`,
    });

    let updatedPayment = payment;
    if (providerResult.status === 'created' && providerResult.providerReference) {
      updatedPayment = await paymentRepository.attachProviderReference(payment.id, providerResult.providerReference);
      updatedPayment = await paymentRepository.updateStatus(payment.id, { status: PAYMENT_STATUS.PROCESSING });
    }

    return {
      order: toOrderDTO(order),
      payment: toPaymentDTO(updatedPayment),
      checkoutUrl: providerResult.checkoutUrl,
      providerAvailable: providerResult.status === 'created',
      message:
        providerResult.status === 'created'
          ? 'Your order is saved. Complete the payment to receive your card.'
          : 'Your order is saved, but online payment is not connected yet. Our team will follow up to arrange payment.',
    };
  },

  /** For the checkout/payment-status screen to poll — public, keyed by the order's own unguessable token, same anonymous-lookup rule as everywhere else in this file family. */
  async getStatusByOrderToken(token) {
    const order = await orderRepository.findByPublicToken(token);
    if (!order) throw ApiError.notFound('Order not found');
    const payments = await paymentRepository.findByOrderId(order.id);
    return { order: toOrderDTO(order), payment: toPaymentDTO(payments[0] || null) };
  },

  /**
   * The ONLY place a payment (and therefore an order) may become "paid".
   * Idempotent: a replayed webhook for a payment already marked "paid"
   * is a safe no-op, never a second delivery attempt. Cross-checks the
   * webhook's own reported amount against what we actually charged for —
   * a mismatch is logged and rejected rather than trusted.
   */
  async handleProviderWebhook(req) {
    if (!paymentProvider.isConfigured || !paymentProvider.verifyWebhookSignature(req)) {
      throw ApiError.badRequest('Webhook rejected');
    }

    const event = paymentProvider.normalizeWebhookEvent(req.body);
    if (!event.providerReference) {
      throw ApiError.badRequest('Webhook missing a transaction reference');
    }

    const payment = await paymentRepository.findByProviderReference(event.providerReference);
    if (!payment) {
      // Not necessarily an attack — could be a webhook for a payment this
      // environment never initiated (e.g. a stale sandbox event). Either
      // way, there's nothing to attach it to.
      throw ApiError.notFound('No matching payment for this reference');
    }

    // Already settled — replay-safe no-op, not an error (providers retry webhooks).
    if (payment.status === PAYMENT_STATUS.PAID) {
      return { alreadyProcessed: true };
    }

    if (!event.isPaid) {
      const nextStatus = PAYMENT_STATUS.FAILED;
      if (canTransition(payment.status, nextStatus)) {
        await paymentRepository.updateStatus(payment.id, { status: nextStatus, failureReason: 'Provider reported payment not successful' });
        if (payment.order_id) await orderRepository.updateStatusFields(payment.order_id, { paymentStatus: ORDER_PAYMENT_STATUS.FAILED });
      }
      return { alreadyProcessed: false, status: 'failed' };
    }

    // A verified "paid" event is always honoured — even from pending,
    // processing, or a previously expired/cancelled state (a late
    // webhook confirming a payment we'd already given up on) — per the
    // explicit "unless there is a legitimate verified provider
    // confirmation" rule. This is the one deliberate exception to the
    // strict transition map in constants/paymentStatus.js.
    if (event.amount !== null && Math.abs(event.amount - Number(payment.amount)) > 0.5) {
      await auditLogRepository.record({
        userId: null,
        action: 'payment.amount_mismatch',
        entityType: 'payment',
        entityId: payment.id,
        metadata: { expected: Number(payment.amount), reported: event.amount },
      });
      throw ApiError.badRequest('Webhook amount does not match the recorded payment');
    }

    await paymentRepository.updateStatus(payment.id, { status: PAYMENT_STATUS.PAID, paidAt: new Date() });

    await auditLogRepository.record({
      userId: null,
      action: 'payment.confirmed',
      entityType: 'payment',
      entityId: payment.id,
      metadata: { orderId: payment.order_id, providerReference: event.providerReference },
    });

    if (payment.order_id) {
      await this._fulfilOrder(payment.order_id);
    }

    return { alreadyProcessed: false, status: 'paid' };
  },

  /** Marks the order paid/completed and — same as Try Our Service — attempts real delivery through the existing SMS/WhatsApp architecture. Never fakes delivery success. */
  async _fulfilOrder(orderId) {
    let order = await orderRepository.updateStatusFields(orderId, {
      status: ORDER_STATUS.COMPLETED,
      paymentStatus: ORDER_PAYMENT_STATUS.PAID,
      deliveryStatus: DELIVERY_STATUS.PROCESSING,
    });
    if (!order) return;

    const template = order.template_id ? await templateRepository.findById(order.template_id) : null;
    if (!template) return;

    const channels = [...DELIVERY_CHANNEL_VALUES];
    const deliveryResult = await deliveryService.deliverOrder({ order, template, channels, requestMeta: {} });

    order = await orderRepository.updateDeliveryResult(orderId, {
      deliveryStatus: deliveryResult.overallStatus,
      smsStatus: deliveryResult.smsStatus,
      smsProviderMessageId: deliveryResult.smsProviderMessageId,
      smsError: deliveryResult.smsError,
      whatsappStatus: deliveryResult.whatsappStatus,
      whatsappProviderMessageId: deliveryResult.whatsappProviderMessageId,
      whatsappError: deliveryResult.whatsappError,
    });

    return { order, deliveryMessage: buildDeliveryMessage({ overallStatus: deliveryResult.overallStatus, channels }) };
  },
};
