import { ApiError } from '../utils/ApiError.js';
import { notificationRepository } from '../repositories/notification.repository.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';

function toDTO(row) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    data: row.data && typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
    isRead: Boolean(row.read_at),
    createdAt: row.created_at,
  };
}

export const notificationsService = {
  /** Called by other services (e.g. rsvp.service.js) to notify an event owner — never exposed as a raw create-for-anyone endpoint. */
  async notify(userId, { type, title, message, data }) {
    return notificationRepository.create({ userId, type, title, message, data });
  },

  async list(userId, { page, limit }) {
    const pagination = parsePagination({ page, limit });
    const { rows, total } = await notificationRepository.findAllByUserId(userId, {
      limit: pagination.limit,
      offset: pagination.offset,
    });

    return {
      notifications: rows.map(toDTO),
      pagination: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, total }),
    };
  },

  async unreadCount(userId) {
    return notificationRepository.countUnreadByUserId(userId);
  },

  async markRead(userId, id) {
    const updated = await notificationRepository.markReadByIdAndUserId(id, userId);
    if (!updated) {
      throw ApiError.notFound('Notification not found');
    }
  },

  async markAllRead(userId) {
    return notificationRepository.markAllReadByUserId(userId);
  },
};
