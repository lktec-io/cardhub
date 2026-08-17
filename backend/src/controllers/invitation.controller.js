import { invitationService } from '../services/invitation.service.js';
import { validateEventId } from '../validators/events.validator.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';

function requestMetaFrom(req) {
  return { ipAddress: req.ip, userAgent: req.headers['user-agent'] };
}

export const invitationController = {
  getConfig: asyncHandler(async (req, res) => {
    validateEventId(req.params.id);
    const invitation = await invitationService.getConfig(req.user.id, req.params.id);
    sendSuccess(res, { data: { invitation } });
  }),

  updateConfig: asyncHandler(async (req, res) => {
    validateEventId(req.params.id);
    const invitation = await invitationService.updateConfig(req.user.id, req.params.id, req.body, requestMetaFrom(req));
    sendSuccess(res, { message: 'Invitation saved successfully', data: { invitation } });
  }),
};
