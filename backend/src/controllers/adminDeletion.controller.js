import { adminDeletionService } from '../services/adminDeletion.service.js';
import { validateNumericId } from '../validators/adminContent.validator.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';

const actor = (req) => ({ userId: req.user.id, ipAddress: req.ip });

export const adminDeletionController = {
  previewEvent: asyncHandler(async (req, res) => {
    sendSuccess(res, { data: await adminDeletionService.previewEvent(validateNumericId(req.params.id)) });
  }),
  deleteEvent: asyncHandler(async (req, res) => {
    sendSuccess(res, { message: 'Event deleted', data: await adminDeletionService.deleteEvent(validateNumericId(req.params.id), req.body?.confirm, actor(req)) });
  }),
  deleteTicketOrder: asyncHandler(async (req, res) => {
    sendSuccess(res, { message: 'Order deleted', data: await adminDeletionService.deleteTicketOrder(validateNumericId(req.params.id), actor(req)) });
  }),
  cancelTicket: asyncHandler(async (req, res) => {
    sendSuccess(res, { message: 'Ticket cancelled', data: await adminDeletionService.cancelTicket(validateNumericId(req.params.id), actor(req)) });
  }),
  deleteCardOrder: asyncHandler(async (req, res) => {
    sendSuccess(res, { message: 'Order deleted', data: await adminDeletionService.deleteCardOrder(validateNumericId(req.params.id), actor(req)) });
  }),
  deleteUser: asyncHandler(async (req, res) => {
    sendSuccess(res, { message: 'Customer deleted', data: await adminDeletionService.deleteUser(validateNumericId(req.params.id), req.body?.confirm, actor(req)) });
  }),
  deleteAuditLog: asyncHandler(async (req, res) => {
    sendSuccess(res, { message: 'Audit entry deleted', data: await adminDeletionService.deleteAuditLog(validateNumericId(req.params.id), actor(req)) });
  }),
  previewAuditPurge: asyncHandler(async (req, res) => {
    sendSuccess(res, { data: await adminDeletionService.previewAuditPurge(req.query.olderThanDays) });
  }),
  purgeAuditLogs: asyncHandler(async (req, res) => {
    sendSuccess(res, { message: 'Audit logs deleted', data: await adminDeletionService.purgeAuditLogs(req.body?.olderThanDays, req.body?.confirm, actor(req)) });
  }),
  securityEvents: asyncHandler(async (req, res) => {
    sendSuccess(res, { data: await adminDeletionService.listSecurityEvents(req.query) });
  }),
};
