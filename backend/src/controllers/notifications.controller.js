import { notificationsService } from '../services/notifications.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

function validateNotificationId(id) {
  if (!/^\d+$/.test(String(id))) {
    throw ApiError.badRequest('Invalid notification id');
  }
}

export const notificationsController = {
  list: asyncHandler(async (req, res) => {
    const result = await notificationsService.list(req.user.id, req.query);
    sendSuccess(res, { message: 'Notifications retrieved successfully', data: result });
  }),

  unreadCount: asyncHandler(async (req, res) => {
    const count = await notificationsService.unreadCount(req.user.id);
    sendSuccess(res, { data: { count } });
  }),

  markRead: asyncHandler(async (req, res) => {
    validateNotificationId(req.params.id);
    await notificationsService.markRead(req.user.id, req.params.id);
    sendSuccess(res, { message: 'Notification marked as read' });
  }),

  markAllRead: asyncHandler(async (req, res) => {
    const count = await notificationsService.markAllRead(req.user.id);
    sendSuccess(res, { message: `${count} notification(s) marked as read`, data: { count } });
  }),
};
