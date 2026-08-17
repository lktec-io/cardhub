import { rsvpService } from '../services/rsvp.service.js';
import { validateRsvpSubmission } from '../validators/rsvp.validator.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';

export const publicRsvpController = {
  submit: asyncHandler(async (req, res) => {
    validateRsvpSubmission(req.body);
    const result = await rsvpService.submit(req.params.slug, req.body, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    sendSuccess(res, { statusCode: 201, message: result.message });
  }),
};
