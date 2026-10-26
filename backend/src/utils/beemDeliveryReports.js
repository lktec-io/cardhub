import { CHANNEL_STATUS } from '../constants/orderStatus.js';

const DELIVERED = /^(delivered|read|seen)$/i;
const FAILED = /^(failed|undelivered|rejected|expired)$/i;

/**
 * Beem template delivery reports -> what to apply to an order.
 * Documented shape: { broadcast_id, message_id, status: accepted|delivered|read|failed,
 * destination, message, timestamp }; a body may also be an array or { data: [...] }.
 * broadcast_id is the jobId Beem returned when the send was accepted (stored as
 * the order's whatsapp_provider_message_id). "accepted" changes nothing: it
 * repeats what the send response already said and is not delivery.
 */
export function parseBeemDeliveryReports(body) {
  const reports = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : body && typeof body === 'object' ? [body] : [];
  return reports.slice(0, 100).map((report) => {
    const status = String(report?.status ?? report?.state ?? '');
    const channelStatus = DELIVERED.test(status) ? CHANNEL_STATUS.SENT : FAILED.test(status) ? CHANNEL_STATUS.FAILED : null;
    return {
      ids: [report?.broadcast_id, report?.message_id, report?.id].filter(Boolean).map(String),
      status,
      channelStatus,
      error: channelStatus === CHANNEL_STATUS.FAILED ? String(report?.message ?? report?.reason ?? status).slice(0, 255) : null,
      destination: report?.destination ?? report?.phoneNumber ?? report?.to ?? null,
    };
  });
}
