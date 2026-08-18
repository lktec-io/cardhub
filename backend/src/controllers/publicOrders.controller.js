import { ordersService } from '../services/orders.service.js';
import { validateTryServicePayload } from '../validators/orders.validator.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';

export const publicOrdersController = {
  submitTryService: asyncHandler(async (req, res) => {
    validateTryServicePayload(req.body);
    const order = await ordersService.submitTryService(req.body, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    sendSuccess(res, {
      statusCode: 201,
      message: 'Your request has been saved. Delivery integration is coming in Phase 2.',
      data: { order },
    });
  }),
};
