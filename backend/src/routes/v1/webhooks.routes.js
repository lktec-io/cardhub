import { Router } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { env } from '../../config/env.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { logger } from '../../utils/logger.js';
import { orderRepository } from '../../repositories/order.repository.js';
import { CHANNEL_STATUS } from '../../constants/orderStatus.js';
import { maskPhoneForLog } from '../../services/providers/whatsappProvider.js';

export const webhooksRouter = Router();

function secretMatches(given) {
  const expected = env.whatsapp.beem.callbackSecret;
  if (!expected || typeof given !== 'string') return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const DELIVERED = /^(delivered|read|seen)$/i;
const FAILED = /^(failed|undelivered|rejected|expired)$/i;

/**
 * Beem WhatsApp delivery reports (BEEM_WHATSAPP_CALLBACK_URL should point
 * here: <API_URL>/webhooks/beem/whatsapp?secret=<BEEM_WHATSAPP_CALLBACK_SECRET>,
 * or send the secret in an `x-callback-secret` header).
 *
 * This is the only place a WhatsApp invitation can move from "queued"
 * (accepted) to "sent" (provider reports delivered/read) or "failed".
 * Beem's report format isn't published, so the handler reads the common
 * fields defensively, logs a sanitized summary, and only changes an order
 * when the report's message id matches one Beem returned at send time.
 */
webhooksRouter.post(
  '/beem/whatsapp',
  asyncHandler(async (req, res) => {
    if (!env.whatsapp.beem.callbackSecret) return res.status(503).json({ success: false, message: 'Callback not configured' });
    if (!secretMatches(req.get('x-callback-secret') || req.query.secret)) return res.status(401).json({ success: false });

    const reports = Array.isArray(req.body) ? req.body : Array.isArray(req.body?.data) ? req.body.data : [req.body || {}];
    let updated = 0;
    for (const report of reports.slice(0, 100)) {
      const messageId = report.id ?? report.message_id ?? report.messageId ?? report.request_id ?? null;
      const status = String(report.status ?? report.state ?? report.delivery_status ?? '');
      logger.info('Beem WhatsApp delivery report', { messageId, status, to: maskPhoneForLog(report.dest_addr ?? report.phoneNumber ?? report.to) });
      if (!messageId) continue;
      const channelStatus = DELIVERED.test(status) ? CHANNEL_STATUS.SENT : FAILED.test(status) ? CHANNEL_STATUS.FAILED : null;
      if (!channelStatus) continue;
      const error = channelStatus === CHANNEL_STATUS.FAILED ? String(report.reason ?? report.error ?? status).slice(0, 255) : null;
      updated += await orderRepository.updateWhatsappStatusByProviderId(String(messageId), channelStatus, error);
    }
    res.json({ success: true, updated });
  })
);
