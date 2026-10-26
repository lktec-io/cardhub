import { Router } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { env } from '../../config/env.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { logger } from '../../utils/logger.js';
import { orderRepository } from '../../repositories/order.repository.js';
import { parseBeemDeliveryReports } from '../../utils/beemDeliveryReports.js';
import { maskPhoneForLog } from '../../services/providers/whatsappProvider.js';

export const webhooksRouter = Router();

function secretMatches(given) {
  const expected = env.whatsapp.beem.callbackSecret;
  if (!expected || typeof given !== 'string') return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Beem WhatsApp delivery reports (BEEM_WHATSAPP_CALLBACK_URL should point
 * here: <API_URL>/webhooks/beem/whatsapp?secret=<BEEM_WHATSAPP_CALLBACK_SECRET>,
 * or send the secret in an `x-callback-secret` header).
 *
 * This is the only place a WhatsApp invitation can move from "queued"
 * (accepted) to "sent" (provider reports delivered/read) or "failed".
 * Beem's documented template report: { broadcast_id, message_id, status:
 * accepted|delivered|read|failed, destination, message, timestamp }.
 * broadcast_id is the jobId Beem returned at send time, which is what the
 * order stores; "accepted" changes nothing. Beem documents no signature,
 * so the shared secret in the callback URL is the authentication.
 */
webhooksRouter.post(
  '/beem/whatsapp',
  asyncHandler(async (req, res) => {
    if (!env.whatsapp.beem.callbackSecret) return res.status(503).json({ success: false, message: 'Callback not configured' });
    if (!secretMatches(req.get('x-callback-secret') || req.query.secret)) return res.status(401).json({ success: false });

    let updated = 0;
    for (const report of parseBeemDeliveryReports(req.body)) {
      logger.info('Beem WhatsApp delivery report', { ids: report.ids, status: report.status, to: maskPhoneForLog(report.destination) });
      if (!report.ids.length || !report.channelStatus) continue;
      for (const id of report.ids) {
        const changed = await orderRepository.updateWhatsappStatusByProviderId(id, report.channelStatus, report.error);
        updated += changed;
        if (changed) break;
      }
    }
    res.json({ success: true, updated });
  })
);
