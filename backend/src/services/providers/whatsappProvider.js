import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

const isConfigured = Boolean(env.whatsapp.provider && env.whatsapp.apiKey);

/**
 * WhatsApp provider abstraction — foundation only, no real provider
 * integrated yet (deliberately, per this phase's scope). `env.whatsapp`
 * reserves `WHATSAPP_PROVIDER`/`WHATSAPP_API_KEY`/`WHATSAPP_API_SECRET`/
 * `WHATSAPP_SENDER_ID` without picking a value, so `isConfigured` is
 * always false until a real provider is chosen.
 *
 * The two methods below (`sendCardMessage`, `sendCardImage`) are the only
 * shape CardHub's business logic (e.g. a future "send this order's card"
 * flow) should ever call — never a provider-specific method or payload
 * shape. That's the point of this file: swapping the real transport
 * between Beem's WhatsApp API and Meta's WhatsApp Cloud API later means
 * filling in the body of these two methods (likely branching on
 * `env.whatsapp.provider`), not touching any caller. Both providers can
 * send a template/session message with an image and a public URL, so
 * neither method shape is provider-specific.
 */
export const whatsappProvider = {
  isConfigured,

  /** payload: { to, message, cardUrl } — a plain text message plus the public card link. */
  async sendCardMessage(payload) {
    if (!isConfigured) {
      logger.warn('WhatsApp message unavailable — no WhatsApp provider configured', { to: payload?.to });
      return { status: 'unavailable' };
    }

    // Real transport (Beem WhatsApp API or Meta WhatsApp Cloud API,
    // selected by env.whatsapp.provider) would be wired in here.
    throw new Error('WhatsApp provider is configured but no transport implementation exists yet');
  },

  /** payload: { to, imageUrl, caption, cardUrl } — the card's image plus a caption/link. */
  async sendCardImage(payload) {
    if (!isConfigured) {
      logger.warn('WhatsApp image unavailable — no WhatsApp provider configured', { to: payload?.to });
      return { status: 'unavailable' };
    }

    throw new Error('WhatsApp provider is configured but no transport implementation exists yet');
  },
};
