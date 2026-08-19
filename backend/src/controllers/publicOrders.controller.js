import { ordersService } from '../services/orders.service.js';
import { validateTryServicePayload } from '../validators/orders.validator.js';
import { getCachedResult, setCachedResult } from '../utils/idempotencyCache.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';

export const publicOrdersController = {
  /** The order confirmation page reached via the SMS/WhatsApp link — GET /public/orders/:token. */
  getByToken: asyncHandler(async (req, res) => {
    const order = await ordersService.getByPublicToken(req.params.token);
    sendSuccess(res, { data: { order } });
  }),

  submitTryService: asyncHandler(async (req, res) => {
    // A browser/network-level retry of the exact same submit carries the
    // same client-generated key, so it replays the already-computed
    // result instead of creating a second order and re-sending the
    // customer's card a second time. See utils/idempotencyCache.js.
    const idempotencyKey =
      typeof req.body.idempotencyKey === 'string' && req.body.idempotencyKey.length <= 100 ? req.body.idempotencyKey : null;

    if (idempotencyKey) {
      const cached = getCachedResult(idempotencyKey);
      if (cached) {
        sendSuccess(res, { statusCode: 201, message: cached.deliveryMessage, data: { order: cached.order } });
        return;
      }
    }

    const { normalizedPhone, normalizedChannels } = validateTryServicePayload(req.body);

    const result = await ordersService.submitTryService(
      { ...req.body, phone: normalizedPhone, channels: normalizedChannels },
      { ipAddress: req.ip, userAgent: req.headers['user-agent'] }
    );

    if (idempotencyKey) setCachedResult(idempotencyKey, result);

    sendSuccess(res, { statusCode: 201, message: result.deliveryMessage, data: { order: result.order } });
  }),
};
