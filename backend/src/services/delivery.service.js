import { smsProvider } from './providers/smsProvider.js';
import { whatsappProvider } from './providers/whatsappProvider.js';
import { auditLogRepository } from '../repositories/auditLog.repository.js';
import { getPublicOrderUrl, getPublicCardImageUrl } from '../utils/publicUrl.js';
import { buildInvitationSms, buildInvitationWhatsapp } from '../utils/messageTemplates.js';
import { DELIVERY_STATUS, CHANNEL_STATUS, DELIVERY_CHANNELS } from '../constants/orderStatus.js';
import { logger } from '../utils/logger.js';

/**
 * Builds the outgoing message text for a channel. Every field here comes
 * from the already-resolved, server-trusted `order` row — never a
 * client-supplied value at send time (see orders.service.js). The
 * invitation number is derived the same way serializeOrder.js does
 * (order id + 1000), so the number a guest sees on their card always
 * matches the one in the SMS.
 */
function messageFieldsFor(order) {
  return {
    guestName: order.guest_name,
    eventType: order.event_type,
    eventName: order.event_name,
    venue: order.venue,
    eventDate: order.event_date,
    eventTime: order.event_time,
    guestType: order.guest_type,
    invitationNumber: String(1000 + Number(order.id)),
  };
}

/**
 * Maps a provider's normalized `status` to the per-channel value stored on
 * the order (orders.sms_status / orders.whatsapp_status). A synchronous
 * "the provider accepted the request" is honestly `queued`, never `sent`
 * — neither Beem nor Meta's synchronous API response confirms the
 * message actually left the provider's system, only that it was
 * accepted. `sent` stays a real, reachable value in the schema for a
 * future delivery-report webhook to upgrade a channel into, not
 * something this synchronous-only implementation ever assigns itself.
 */
function toChannelStatus(providerResult) {
  if (providerResult.status === 'queued') return CHANNEL_STATUS.QUEUED;
  if (providerResult.status === 'unavailable') return CHANNEL_STATUS.UNAVAILABLE;
  return CHANNEL_STATUS.FAILED;
}

/**
 * "sent" here means exactly what the spec defines: every *requested*
 * channel was successfully accepted by its provider — not that any
 * recipient actually received anything. `not_requested` channels never
 * count against the order (an order that only asked for SMS is `sent`
 * once SMS succeeds, regardless of WhatsApp never having been asked).
 */
function computeOverallDeliveryStatus(channelResults) {
  const requested = Object.values(channelResults);
  if (requested.length === 0) return DELIVERY_STATUS.PENDING;

  const accepted = requested.filter((r) => r.status === 'queued');
  if (accepted.length === requested.length) return DELIVERY_STATUS.SENT;
  if (accepted.length === 0) return DELIVERY_STATUS.FAILED;
  return DELIVERY_STATUS.PARTIALLY_SENT;
}

async function recordAttempt({ order, channel, result, requestMeta }) {
  // Deliberately never includes the phone number — it's already stored
  // once on the order row (guest_phone), no need to duplicate PII into
  // the audit trail. Never includes provider credentials (the provider
  // files themselves never surface them either).
  await auditLogRepository.record({
    userId: order.user_id ?? null,
    action: 'order.delivery_attempted',
    entityType: 'order',
    entityId: order.id,
    metadata: {
      channel,
      provider: result.provider ?? null,
      status: result.status,
      providerMessageId: result.providerMessageId ?? null,
      error: result.error ?? null,
    },
    ipAddress: requestMeta?.ipAddress,
    userAgent: requestMeta?.userAgent,
  });
}

export const deliveryService = {
  /**
   * Sends the order's card through every requested channel and returns
   * `{ channelResults, overallStatus }`. Never throws on a provider
   * failure — a failed/unavailable channel is a normal, honestly-recorded
   * outcome, not an exception. The caller (orders.service.js) is
   * responsible for persisting the results.
   *
   * `template` and `order` are already resolved, trusted server-side
   * objects — this function never accepts a client-supplied URL for
   * either the card image or the destination link (see
   * utils/publicUrl.js, which derives both from the resolved template
   * and the order's own public_token).
   */
  async deliverOrder({ order, template, channels, requestMeta }) {
    const publicUrl = getPublicOrderUrl(order.rsvp_code || order.public_token);
    const fields = messageFieldsFor(order);
    const channelResults = {};

    // Each channel is independently try/caught — a bug or unexpected
    // throw in one provider must never prevent the other channel from
    // being attempted (see prompt requirement: SMS must still send if
    // WhatsApp is unconfigured/broken, and vice versa).
    if (channels.includes(DELIVERY_CHANNELS.SMS)) {
      let result;
      try {
        const message = buildInvitationSms({ ...fields, publicUrl });
        result = await smsProvider.send({ to: order.guest_phone, message });
      } catch (error) {
        logger.error('SMS delivery threw unexpectedly', { orderId: order.id, message: error.message });
        result = { status: 'failed', provider: 'beem', providerMessageId: null, error: error.message };
      }
      channelResults.sms = result;
      await recordAttempt({ order, channel: DELIVERY_CHANNELS.SMS, result, requestMeta });
    }

    if (channels.includes(DELIVERY_CHANNELS.WHATSAPP)) {
      let result;
      try {
        const imageUrl = getPublicCardImageUrl(template);
        const caption = buildInvitationWhatsapp({ ...fields, publicUrl });
        result = imageUrl
          ? await whatsappProvider.sendCardImage({ to: order.guest_phone, imageUrl, caption })
          : await whatsappProvider.sendCardMessage({ to: order.guest_phone, message: caption });
      } catch (error) {
        logger.error('WhatsApp delivery threw unexpectedly', { orderId: order.id, message: error.message });
        result = { status: 'failed', provider: whatsappProvider.providerName, providerMessageId: null, error: error.message };
      }
      channelResults.whatsapp = result;
      await recordAttempt({ order, channel: DELIVERY_CHANNELS.WHATSAPP, result, requestMeta });
    }

    const overallStatus = computeOverallDeliveryStatus(channelResults);

    logger.info('Delivery attempt complete', {
      orderId: order.id,
      overallStatus,
      sms: channelResults.sms?.status,
      whatsapp: channelResults.whatsapp?.status,
    });

    return {
      overallStatus,
      smsStatus: channelResults.sms ? toChannelStatus(channelResults.sms) : CHANNEL_STATUS.NOT_REQUESTED,
      smsProviderMessageId: channelResults.sms?.providerMessageId ?? null,
      smsError: channelResults.sms?.error ?? null,
      whatsappStatus: channelResults.whatsapp ? toChannelStatus(channelResults.whatsapp) : CHANNEL_STATUS.NOT_REQUESTED,
      whatsappProviderMessageId: channelResults.whatsapp?.providerMessageId ?? null,
      whatsappError: channelResults.whatsapp?.error ?? null,
    };
  },
};
