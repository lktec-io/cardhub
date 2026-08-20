import { ApiError } from '../utils/ApiError.js';
import { userRepository } from '../repositories/user.repository.js';
import { eventRepository } from '../repositories/event.repository.js';
import { templateRepository } from '../repositories/template.repository.js';
import { guestRepository } from '../repositories/guest.repository.js';
import { orderRepository } from '../repositories/order.repository.js';
import { paymentRepository } from '../repositories/payment.repository.js';
import { auditLogRepository } from '../repositories/auditLog.repository.js';
import { toPublicUser } from '../utils/serializeUser.js';
import { toEventDTO, toPublicTemplate } from '../utils/serializeEvent.js';
import { toOrderDTO, toAdminOrderDTO } from '../utils/serializeOrder.js';
import { toAdminPaymentDTO } from '../utils/serializePayment.js';
import { escapeLike } from '../utils/escapeLike.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';
import { ROLES } from '../constants/roles.js';
import { PRICING_TIER_VALUES } from '../constants/pricingTiers.js';
import { ORDER_STATUS } from '../constants/orderStatus.js';
import { PAYMENT_STATUS_VALUES, PAYMENT_METHOD_VALUES } from '../constants/paymentStatus.js';
import { validateOrderStatusUpdate } from '../validators/orders.validator.js';

const USER_STATUS_VALUES = ['active', 'inactive', 'suspended'];
const TEMPLATE_STATUS_VALUES = ['active', 'inactive'];

export const adminService = {
  async getStats() {
    const [totalCustomers, totalEvents, publishedInvitations, guestStats, totalOrders, pendingOrders, cardsSold, revenueTzs, paymentStats] =
      await Promise.all([
        userRepository.countByRole(ROLES.CUSTOMER),
        eventRepository.countAll(),
        eventRepository.countAllPublished(),
        guestRepository.getPlatformStats(),
        orderRepository.countAll(),
        orderRepository.countByStatus(ORDER_STATUS.PENDING),
        orderRepository.sumCardsSold(),
        orderRepository.sumRevenue(),
        paymentRepository.getStats(),
      ]);

    return {
      payments: {
        total: Number(paymentStats.total),
        paid: Number(paymentStats.paid),
        pending: Number(paymentStats.pending),
        processing: Number(paymentStats.processing),
        failed: Number(paymentStats.failed),
        cancelled: Number(paymentStats.cancelled),
        expired: Number(paymentStats.expired),
        totalPaidTzs: Number(paymentStats.total_paid_amount),
      },
      totalCustomers,
      totalEvents,
      publishedInvitations,
      totalGuests: guestStats.total,
      rsvpResponses: guestStats.attending + guestStats.declined,
      attending: guestStats.attending,
      declined: guestStats.declined,
      totalOrders,
      pendingOrders,
      cardsSold,
      // Real (possibly zero) figures from the orders table — revenueTzs
      // only counts orders marked payment_status = 'paid'. No payment
      // provider is connected yet, so today that will always be 0 from a
      // genuinely empty set, never an invented number.
      revenueTzs,
      activeSubscriptions: 0,
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
    // Customer identity is already known from `user` above — no need to
    // re-join it per order, so this uses the plain order DTO, not the
    // admin one.
    const orders = await orderRepository.findAllByUserIdForAdmin(id);
    return { ...toPublicUser(user), orders: orders.map(toOrderDTO) };
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

  /**
   * Foundation-level template editing for Phase 9 — assigning which price
   * tier a design belongs to. Editing a template's name/description/config
   * or creating a brand-new template from admin is deliberately deferred
   * to Phase 2 of this commercial track (see docs/architecture.md "Phase
   * 9 — Commercial Foundation") rather than half-built here.
   */
  async updateTemplatePricingTier(id, pricingTier, adminUserId, requestMeta) {
    if (!PRICING_TIER_VALUES.includes(pricingTier)) {
      throw ApiError.validation([{ field: 'pricingTier', message: 'Invalid pricing tier' }]);
    }
    const existing = await templateRepository.findById(id);
    if (!existing) throw ApiError.notFound('Template not found');

    const template = await templateRepository.updatePricingTier(id, pricingTier);

    await auditLogRepository.record({
      userId: adminUserId,
      action: 'admin.template_pricing_tier_changed',
      entityType: 'template',
      entityId: id,
      metadata: { pricingTier },
      ipAddress: requestMeta?.ipAddress,
      userAgent: requestMeta?.userAgent,
    });

    return toPublicTemplate(template);
  },

  async listOrders({ page, limit, status, search }) {
    const pagination = parsePagination({ page, limit });
    const { rows, total } = await orderRepository.findAllAdmin({
      limit: pagination.limit,
      offset: pagination.offset,
      status,
      search: search ? escapeLike(search) : undefined,
    });

    const paymentsByOrderId = await paymentRepository.findLatestByOrderIds(rows.map((row) => row.id));

    return {
      orders: rows.map((row) => toAdminOrderDTO(row, paymentsByOrderId[row.id])),
      pagination: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, total }),
    };
  },

  async getOrder(id) {
    const order = await orderRepository.findById(id);
    if (!order) throw ApiError.notFound('Order not found');
    const payments = await paymentRepository.findByOrderId(id);
    return toAdminOrderDTO(order, payments[0]);
  },

  /**
   * Manual status reconciliation — the honest foundation before a real
   * payment/delivery provider exists. An admin marking an order "paid"
   * here reflects a real-world manual confirmation (e.g. mobile money
   * received outside the app); it is never an automated/fake success.
   */
  async updateOrderStatus(id, { status, paymentStatus, deliveryStatus }, adminUserId, requestMeta) {
    validateOrderStatusUpdate({ status, paymentStatus, deliveryStatus });

    const existing = await orderRepository.findById(id);
    if (!existing) throw ApiError.notFound('Order not found');

    const order = await orderRepository.updateStatusFields(id, { status, paymentStatus, deliveryStatus });

    await auditLogRepository.record({
      userId: adminUserId,
      action: 'admin.order_status_changed',
      entityType: 'order',
      entityId: id,
      metadata: { status, paymentStatus, deliveryStatus },
      ipAddress: requestMeta?.ipAddress,
      userAgent: requestMeta?.userAgent,
    });

    return toAdminOrderDTO(order);
  },

  /** Read-only admin payment listing — see payment.repository.js#findAllAdmin for the search/filter shape. */
  async listPayments({ page, limit, status, method, dateFrom, dateTo, search }) {
    if (status && !PAYMENT_STATUS_VALUES.includes(status)) {
      throw ApiError.validation([{ field: 'status', message: 'Invalid payment status' }]);
    }
    if (method && !PAYMENT_METHOD_VALUES.includes(method)) {
      throw ApiError.validation([{ field: 'method', message: 'Invalid payment method' }]);
    }
    const pagination = parsePagination({ page, limit });
    const { rows, total } = await paymentRepository.findAllAdmin({
      limit: pagination.limit,
      offset: pagination.offset,
      status,
      method,
      dateFrom,
      dateTo,
      search: search ? escapeLike(search) : undefined,
    });

    return {
      payments: rows.map(toAdminPaymentDTO),
      pagination: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, total }),
    };
  },

  async getPayment(id) {
    const payment = await paymentRepository.findByIdAdmin(id);
    if (!payment) throw ApiError.notFound('Payment not found');
    return toAdminPaymentDTO(payment);
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
