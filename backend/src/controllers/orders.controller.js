import { ordersService } from '../services/orders.service.js';
import { validateOrderId, validateOrderQuery } from '../validators/orders.validator.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';

export const ordersController = {
  list: asyncHandler(async (req, res) => {
    validateOrderQuery(req.query);
    const result = await ordersService.listMine(req.user.id, req.query);
    sendSuccess(res, { message: 'Orders retrieved successfully', data: result });
  }),

  getOne: asyncHandler(async (req, res) => {
    validateOrderId(req.params.id);
    const order = await ordersService.getMine(req.user.id, req.params.id);
    sendSuccess(res, { data: { order } });
  }),
};
