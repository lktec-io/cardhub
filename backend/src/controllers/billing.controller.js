import { billingService } from '../services/billing.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { PLANS } from '../constants/plans.js';

export const billingController = {
  getSummary: asyncHandler(async (req, res) => {
    const summary = await billingService.getSummary(req.user.id);
    sendSuccess(res, { data: summary });
  }),

  startUpgrade: asyncHandler(async (req, res) => {
    const { planId } = req.body;
    if (!planId || !PLANS[planId]) {
      throw ApiError.validation([{ field: 'planId', message: 'Please choose a valid plan' }]);
    }
    const result = await billingService.startUpgrade(req.user.id, planId);
    sendSuccess(res, { data: result });
  }),
};
