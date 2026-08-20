import { paymentService } from '../services/payment.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';
import { logger } from '../utils/logger.js';

export const paymentsController = {
  /**
   * Real webhook receiver. Rejects anything unsigned/unconfigured
   * (ApiError thrown by payment.service.js -> errorHandler.js sanitizes
   * it into a clean 4xx, same as every other endpoint — never leaks a
   * stack trace or raw provider payload back to the caller). Sanitized
   * before logging: only the normalized reference/order id, never the
   * full raw provider body or any credential.
   */
  webhook: asyncHandler(async (req, res) => {
    const result = await paymentService.handleProviderWebhook(req);
    logger.info('Payment webhook processed', { status: result.status, alreadyProcessed: result.alreadyProcessed });
    sendSuccess(res, { message: 'Webhook processed' });
  }),
};
