import { contactService } from '../services/contact.service.js';
import { validateContactPayload } from '../validators/contact.validator.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';

export const contactController = {
  submit: asyncHandler(async (req, res) => {
    validateContactPayload(req.body);
    const result = await contactService.submit(req.body, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    sendSuccess(res, { statusCode: 201, message: result.message });
  }),
};
