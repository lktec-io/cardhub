import { paymentService } from '../services/payment.service.js';
import { validateCheckoutPayload, validatePaymentToken } from '../validators/payment.validator.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';

export const checkoutController = {
  /** Public — creates a real, paid-tier order + a pending payment, then asks the provider to start checkout. Never marks anything "paid" here. */
  initiate: asyncHandler(async (req, res) => {
    const validated = validateCheckoutPayload(req.body);
    const result = await paymentService.initiateCheckout(
      { ...req.body, phone: validated.normalizedPhone, ...validated },
      { ipAddress: req.ip, userAgent: req.headers['user-agent'] }
    );
    sendSuccess(res, { statusCode: 201, message: result.message, data: result });
  }),

  /** Public — the checkout/payment-status screen polls this, keyed by the order's own unguessable token. */
  status: asyncHandler(async (req, res) => {
    validatePaymentToken(req.params.token);
    const result = await paymentService.getStatusByOrderToken(req.params.token);
    sendSuccess(res, { data: result });
  }),
};
