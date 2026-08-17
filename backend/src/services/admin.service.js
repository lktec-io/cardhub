import { ApiError } from '../utils/ApiError.js';
import { userRepository } from '../repositories/user.repository.js';
import { eventRepository } from '../repositories/event.repository.js';
import { templateRepository } from '../repositories/template.repository.js';
import { guestRepository } from '../repositories/guest.repository.js';
import { auditLogRepository } from '../repositories/auditLog.repository.js';
import { toPublicUser } from '../utils/serializeUser.js';
import { toEventDTO, toPublicTemplate } from '../utils/serializeEvent.js';
import { escapeLike } from '../utils/escapeLike.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';

const USER_STATUS_VALUES = ['active', 'inactive', 'suspended'];
const TEMPLATE_STATUS_VALUES = ['active', 'inactive'];

export const adminService = {
  async getStats() {
    const [totalUsers, totalEvents, publishedInvitations, guestStats] = await Promise.all([
      userRepository.countAll(),
      eventRepository.countAll(),
      eventRepository.countAllPublished(),
      guestRepository.getPlatformStats(),
    ]);

    return {
      totalUsers,
      totalEvents,
      publishedInvitations,
      totalGuests: guestStats.total,
      rsvpResponses: guestStats.attending + guestStats.declined,
      attending: guestStats.attending,
      declined: guestStats.declined,
      // No payment provider is connected — these are real zeros from real
      // (empty) tables, not invented figures. See docs/architecture.md.
      activeSubscriptions: 0,
      revenueTzs: 0,
    };
  },

  async listUsers({ page, limit, search }) {
    const pagination = parsePagination({ page, limit });
    const { rows, total } = await userRepository.findAllPaginated({
      limit: pagination.limit,
      offset: pagination.offset,
      search: search ? escapeLike(search) : undefined,
    });

    return {
      users: rows.map(toPublicUser),
      pagination: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, total }),
    };
  },

  async getUser(id) {
    const user = await userRepository.findById(id);
    if (!user) throw ApiError.notFound('User not found');
    return toPublicUser(user);
  },

  async updateUserStatus(id, status, adminUserId, requestMeta) {
    if (!USER_STATUS_VALUES.includes(status)) {
      throw ApiError.validation([{ field: 'status', message: 'Invalid account status' }]);
    }
    const existing = await userRepository.findById(id);
    if (!existing) throw ApiError.notFound('User not found');
    if (existing.role === 'admin' && status !== 'active') {
      throw ApiError.forbidden('Admin accounts cannot be suspended from this screen');
    }

    const user = await userRepository.updateStatus(id, status);

    await auditLogRepository.record({
      userId: adminUserId,
      action: 'admin.user_status_changed',
      entityType: 'user',
      entityId: id,
      metadata: { status },
      ipAddress: requestMeta?.ipAddress,
      userAgent: requestMeta?.userAgent,
    });

    return toPublicUser(user);
  },

  async listEvents({ page, limit, search, status }) {
    const pagination = parsePagination({ page, limit });
    const { rows, total } = await eventRepository.findAllPaginatedAdmin({
      limit: pagination.limit,
      offset: pagination.offset,
      search: search ? escapeLike(search) : undefined,
      status,
    });

    return {
      events: rows.map((row) => ({ ...toEventDTO(row), ownerName: row.owner_name, ownerEmail: row.owner_email })),
      pagination: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, total }),
    };
  },

  async listTemplates({ page, limit }) {
    const pagination = parsePagination({ page, limit });
    const { rows, total } = await templateRepository.findAllAdmin({ limit: pagination.limit, offset: pagination.offset });

    return {
      templates: rows.map(toPublicTemplate),
      pagination: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, total }),
    };
  },

  async updateTemplateStatus(id, status, adminUserId, requestMeta) {
    if (!TEMPLATE_STATUS_VALUES.includes(status)) {
      throw ApiError.validation([{ field: 'status', message: 'Invalid template status' }]);
    }
    const existing = await templateRepository.findById(id);
    if (!existing) throw ApiError.notFound('Template not found');

    const template = await templateRepository.updateStatus(id, status);

    await auditLogRepository.record({
      userId: adminUserId,
      action: 'admin.template_status_changed',
      entityType: 'template',
      entityId: id,
      metadata: { status },
      ipAddress: requestMeta?.ipAddress,
      userAgent: requestMeta?.userAgent,
    });

    return toPublicTemplate(template);
  },

  async listAuditLogs({ page, limit, action, userId }) {
    const pagination = parsePagination({ page, limit });
    const { rows, total } = await auditLogRepository.findAllPaginated({
      limit: pagination.limit,
      offset: pagination.offset,
      action,
      userId,
    });

    return {
      logs: rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        action: row.action,
        entityType: row.entity_type,
        entityId: row.entity_id,
        metadata: row.metadata && typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
        createdAt: row.created_at,
      })),
      pagination: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, total }),
    };
  },
};
