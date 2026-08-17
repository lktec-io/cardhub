import { eventsService } from '../services/events.service.js';
import {
  validateCreateEventPayload,
  validateUpdateEventPayload,
  validateChangeTemplatePayload,
  validateEventQuery,
  validateEventId,
} from '../validators/events.validator.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';

function requestMetaFrom(req) {
  return { ipAddress: req.ip, userAgent: req.headers['user-agent'] };
}

export const eventsController = {
  list: asyncHandler(async (req, res) => {
    validateEventQuery(req.query);
    const result = await eventsService.list(req.user.id, req.query);
    sendSuccess(res, { message: 'Events retrieved successfully', data: result });
  }),

  create: asyncHandler(async (req, res) => {
    validateCreateEventPayload(req.body);
    const event = await eventsService.create(req.user.id, req.body, requestMetaFrom(req));
    sendSuccess(res, { statusCode: 201, message: 'Event created successfully', data: { event } });
  }),

  getOne: asyncHandler(async (req, res) => {
    validateEventId(req.params.id);
    const event = await eventsService.getOne(req.user.id, req.params.id);
    sendSuccess(res, { data: { event } });
  }),

  update: asyncHandler(async (req, res) => {
    validateEventId(req.params.id);
    validateUpdateEventPayload(req.body);
    const event = await eventsService.update(req.user.id, req.params.id, req.body, requestMetaFrom(req));
    sendSuccess(res, { message: 'Event updated successfully', data: { event } });
  }),

  remove: asyncHandler(async (req, res) => {
    validateEventId(req.params.id);
    await eventsService.remove(req.user.id, req.params.id, requestMetaFrom(req));
    sendSuccess(res, { message: 'Event deleted successfully' });
  }),

  duplicate: asyncHandler(async (req, res) => {
    validateEventId(req.params.id);
    const event = await eventsService.duplicate(req.user.id, req.params.id, requestMetaFrom(req));
    sendSuccess(res, { statusCode: 201, message: 'Event duplicated successfully', data: { event } });
  }),

  changeTemplate: asyncHandler(async (req, res) => {
    validateEventId(req.params.id);
    validateChangeTemplatePayload(req.body);
    const event = await eventsService.changeTemplate(req.user.id, req.params.id, req.body.templateId, requestMetaFrom(req));
    sendSuccess(res, { message: 'Template updated successfully', data: { event } });
  }),

  publish: asyncHandler(async (req, res) => {
    validateEventId(req.params.id);
    const event = await eventsService.publish(req.user.id, req.params.id, requestMetaFrom(req));
    sendSuccess(res, { message: 'Invitation published successfully', data: { event } });
  }),

  unpublish: asyncHandler(async (req, res) => {
    validateEventId(req.params.id);
    const event = await eventsService.unpublish(req.user.id, req.params.id, requestMetaFrom(req));
    sendSuccess(res, { message: 'Invitation unpublished', data: { event } });
  }),

  analytics: asyncHandler(async (req, res) => {
    validateEventId(req.params.id);
    const analytics = await eventsService.getAnalytics(req.user.id, req.params.id);
    sendSuccess(res, { data: { analytics } });
  }),
};
