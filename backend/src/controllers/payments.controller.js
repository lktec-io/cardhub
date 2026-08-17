import { paymentProvider } from '../services/providers/paymentProvider.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendError, sendSuccess } from '../utils/ApiResponse.js';
import { logger } from '../utils/logger.js';

export const paymentsController = {
  /**
   * Webhook receiver stub. No payment provider is configured, so every
   * call is rejected — this deliberately never marks a payment "paid"
   * from an unverified or absent signature. Once a real provider is
   * connected, verifyWebhookSignature() gets a real implementation and
   * this handler updates the matching `payments` row from the verified
   * event, never from anything the frontend sends.
   */
  webhook: asyncHandler(async (req, res) => {
    if (!paymentProvider.isConfigured || !paymentProvider.verifyWebhookSignature(req)) {
      logger.warn('Rejected payment webhook — no provider configured or signature invalid');
      return sendError(res, { statusCode: 400, code: 'BAD_REQUEST', message: 'Webhook rejected' });
    }

    // Unreachable until a real provider is configured.
    sendSuccess(res, { message: 'Webhook processed' });
  }),
};
