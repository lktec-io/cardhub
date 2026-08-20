import { adminService } from '../services/admin.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

function requestMetaFrom(req) {
  return { ipAddress: req.ip, userAgent: req.headers['user-agent'] };
}

function validateId(id) {
  if (!/^\d+$/.test(String(id))) throw ApiError.badRequest('Invalid id');
}

export const adminController = {
  stats: asyncHandler(async (req, res) => {
    const stats = await adminService.getStats();
    sendSuccess(res, { data: { stats } });
  }),

  listUsers: asyncHandler(async (req, res) => {
    const result = await adminService.listUsers(req.query);
    sendSuccess(res, { data: result });
  }),

  getUser: asyncHandler(async (req, res) => {
    validateId(req.params.id);
    const user = await adminService.getUser(req.params.id);
    sendSuccess(res, { data: { user } });
  }),

  updateUserStatus: asyncHandler(async (req, res) => {
    validateId(req.params.id);
    const user = await adminService.updateUserStatus(req.params.id, req.body.status, req.user.id, requestMetaFrom(req));
    sendSuccess(res, { message: 'User status updated', data: { user } });
  }),

  listEvents: asyncHandler(async (req, res) => {
    const result = await adminService.listEvents(req.query);
    sendSuccess(res, { data: result });
  }),

  listTemplates: asyncHandler(async (req, res) => {
    const result = await adminService.listTemplates(req.query);
    sendSuccess(res, { data: result });
  }),

  updateTemplateStatus: asyncHandler(async (req, res) => {
    validateId(req.params.id);
    const template = await adminService.updateTemplateStatus(req.params.id, req.body.status, req.user.id, requestMetaFrom(req));
    sendSuccess(res, { message: 'Template status updated', data: { template } });
  }),

  updateTemplatePricingTier: asyncHandler(async (req, res) => {
    validateId(req.params.id);
    const template = await adminService.updateTemplatePricingTier(
      req.params.id,
      req.body.pricingTier,
      req.user.id,
      requestMetaFrom(req)
    );
    sendSuccess(res, { message: 'Template pricing tier updated', data: { template } });
  }),

  listOrders: asyncHandler(async (req, res) => {
    const result = await adminService.listOrders(req.query);
    sendSuccess(res, { data: result });
  }),

  getOrder: asyncHandler(async (req, res) => {
    validateId(req.params.id);
    const order = await adminService.getOrder(req.params.id);
    sendSuccess(res, { data: { order } });
  }),

  updateOrderStatus: asyncHandler(async (req, res) => {
    validateId(req.params.id);
    const order = await adminService.updateOrderStatus(req.params.id, req.body, req.user.id, requestMetaFrom(req));
    sendSuccess(res, { message: 'Order updated', data: { order } });
  }),

  listPayments: asyncHandler(async (req, res) => {
    const result = await adminService.listPayments(req.query);
    sendSuccess(res, { data: result });
  }),

  getPayment: asyncHandler(async (req, res) => {
    validateId(req.params.id);
    const payment = await adminService.getPayment(req.params.id);
    sendSuccess(res, { data: { payment } });
  }),

  listAuditLogs: asyncHandler(async (req, res) => {
    const result = await adminService.listAuditLogs(req.query);
    sendSuccess(res, { data: result });
  }),
};
