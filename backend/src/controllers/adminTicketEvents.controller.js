import { rm } from 'node:fs/promises';
import { adminTicketEventsService } from '../services/adminTicketEvents.service.js';
import { validateAdminEventDetails } from '../validators/adminEvents.validator.js';
import { validateTicketSettingsPayload } from '../validators/eventTickets.validator.js';
import { validateNumericId } from '../validators/adminContent.validator.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';

const meta = (req) => ({ ipAddress: req.ip, userAgent: req.headers['user-agent'] });

export const adminTicketEventsController = {
  list: asyncHandler(async (req, res) => {
    sendSuccess(res, { data: await adminTicketEventsService.list(req.query) });
  }),

  create: asyncHandler(async (req, res) => {
    const data = await adminTicketEventsService.create(validateAdminEventDetails(req.body), req.user.id, meta(req));
    sendSuccess(res, { statusCode: 201, message: 'Event created', data });
  }),

  get: asyncHandler(async (req, res) => {
    sendSuccess(res, { data: await adminTicketEventsService.get(validateNumericId(req.params.id)) });
  }),

  updateDetails: asyncHandler(async (req, res) => {
    const id = validateNumericId(req.params.id);
    const data = await adminTicketEventsService.updateDetails(id, validateAdminEventDetails(req.body), req.user.id, meta(req));
    sendSuccess(res, { message: 'Event updated', data });
  }),

  uploadPoster: asyncHandler(async (req, res) => {
    try {
      const data = await adminTicketEventsService.uploadPoster(validateNumericId(req.params.id), req.file, req.user.id, meta(req));
      sendSuccess(res, { message: 'Poster updated', data });
    } finally {
      if (req.file?.path) await rm(req.file.path, { force: true }).catch(() => {});
    }
  }),

  publish: asyncHandler(async (req, res) => {
    const data = await adminTicketEventsService.setPublished(validateNumericId(req.params.id), true, req.user.id, meta(req));
    sendSuccess(res, { message: 'Event published', data });
  }),

  unpublish: asyncHandler(async (req, res) => {
    const data = await adminTicketEventsService.setPublished(validateNumericId(req.params.id), false, req.user.id, meta(req));
    sendSuccess(res, { message: 'Event unpublished', data });
  }),

  saveTickets: asyncHandler(async (req, res) => {
    const id = validateNumericId(req.params.id);
    const data = await adminTicketEventsService.saveTickets(id, validateTicketSettingsPayload(req.body), req.user.id, meta(req));
    sendSuccess(res, { message: 'Ticket settings saved', data });
  }),

  orders: asyncHandler(async (req, res) => {
    sendSuccess(res, { data: await adminTicketEventsService.listOrders(validateNumericId(req.params.id), req.query) });
  }),

  tickets: asyncHandler(async (req, res) => {
    sendSuccess(res, { data: await adminTicketEventsService.listTickets(validateNumericId(req.params.id), req.query) });
  }),
};
