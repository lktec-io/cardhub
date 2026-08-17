import { templatesService } from '../services/templates.service.js';
import { validateTemplateQuery, validateTemplateId } from '../validators/templates.validator.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';

export const templatesController = {
  list: asyncHandler(async (req, res) => {
    validateTemplateQuery(req.query);
    const result = await templatesService.list(req.query);
    sendSuccess(res, { message: 'Templates retrieved successfully', data: result });
  }),

  getById: asyncHandler(async (req, res) => {
    validateTemplateId(req.params.id);
    const template = await templatesService.getById(req.params.id);
    sendSuccess(res, { data: { template } });
  }),
};
