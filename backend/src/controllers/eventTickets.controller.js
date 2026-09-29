import { eventTicketsService } from '../services/eventTickets.service.js';
import { validateEventId } from '../validators/events.validator.js';
import { validateTicketSettingsPayload } from '../validators/eventTickets.validator.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';

export const eventTicketsController = {
  get: asyncHandler(async (req, res) => {
    validateEventId(req.params.id);
    const data = await eventTicketsService.getForOwner(req.user.id, req.params.id);
    sendSuccess(res, { data });
  }),

  save: asyncHandler(async (req, res) => {
    validateEventId(req.params.id);
    const input = validateTicketSettingsPayload(req.body);
    const data = await eventTicketsService.saveForOwner(req.user.id, req.params.id, input, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    sendSuccess(res, { message: 'Ticket settings saved', data });
  }),
};
