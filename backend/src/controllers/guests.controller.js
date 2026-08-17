import { guestsService } from '../services/guests.service.js';
import {
  validateCreateGuestPayload,
  validateUpdateGuestPayload,
  validateGuestQuery,
  validateGuestId,
  validateBulkDeletePayload,
  validateBulkImportPayload,
} from '../validators/guests.validator.js';
import { validateEventId } from '../validators/events.validator.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';

function requestMetaFrom(req) {
  return { ipAddress: req.ip, userAgent: req.headers['user-agent'] };
}

export const guestsController = {
  list: asyncHandler(async (req, res) => {
    validateEventId(req.params.id);
    validateGuestQuery(req.query);
    const result = await guestsService.list(req.user.id, req.params.id, req.query);
    sendSuccess(res, { message: 'Guests retrieved successfully', data: result });
  }),

  stats: asyncHandler(async (req, res) => {
    validateEventId(req.params.id);
    const stats = await guestsService.stats(req.user.id, req.params.id);
    sendSuccess(res, { data: { stats } });
  }),

  create: asyncHandler(async (req, res) => {
    validateEventId(req.params.id);
    validateCreateGuestPayload(req.body);
    const guest = await guestsService.create(req.user.id, req.params.id, req.body, requestMetaFrom(req));
    sendSuccess(res, { statusCode: 201, message: 'Guest added successfully', data: { guest } });
  }),

  getOne: asyncHandler(async (req, res) => {
    validateEventId(req.params.id);
    validateGuestId(req.params.guestId);
    const guest = await guestsService.getOne(req.user.id, req.params.id, req.params.guestId);
    sendSuccess(res, { data: { guest } });
  }),

  update: asyncHandler(async (req, res) => {
    validateEventId(req.params.id);
    validateGuestId(req.params.guestId);
    validateUpdateGuestPayload(req.body);
    const guest = await guestsService.update(req.user.id, req.params.id, req.params.guestId, req.body, requestMetaFrom(req));
    sendSuccess(res, { message: 'Guest updated successfully', data: { guest } });
  }),

  remove: asyncHandler(async (req, res) => {
    validateEventId(req.params.id);
    validateGuestId(req.params.guestId);
    await guestsService.remove(req.user.id, req.params.id, req.params.guestId, requestMetaFrom(req));
    sendSuccess(res, { message: 'Guest removed successfully' });
  }),

  bulkRemove: asyncHandler(async (req, res) => {
    validateEventId(req.params.id);
    validateBulkDeletePayload(req.body);
    const deleted = await guestsService.bulkRemove(req.user.id, req.params.id, req.body.guestIds, requestMetaFrom(req));
    sendSuccess(res, { message: `${deleted} guest(s) removed`, data: { deleted } });
  }),

  bulkImport: asyncHandler(async (req, res) => {
    validateEventId(req.params.id);
    const { valid, invalid } = validateBulkImportPayload(req.body);
    const imported = valid.length ? await guestsService.bulkImport(req.user.id, req.params.id, valid, requestMetaFrom(req)) : 0;
    sendSuccess(res, {
      statusCode: 201,
      message: `Imported ${imported} guest(s)`,
      data: { imported, skipped: valid.length - imported, invalid },
    });
  }),
};
