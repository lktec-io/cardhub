import { ApiError } from '../utils/ApiError.js';
import { orderRepository } from '../repositories/order.repository.js';
import { templateRepository } from '../repositories/template.repository.js';
import { auditLogRepository } from '../repositories/auditLog.repository.js';
import { getPricingTier, DEFAULT_PRICING_TIER } from '../constants/pricingTiers.js';
import { ORDER_SOURCE } from '../constants/orderStatus.js';
import { toOrderDTO } from '../utils/serializeOrder.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';

/**
 * The "an order must belong to a real user OR carry guest contact info"
 * rule cannot be a MySQL CHECK constraint here — user_id already carries
 * an ON DELETE SET NULL referential action (fk_orders_user in migration
 * 016), and MySQL 8 rejects a column driven by a referential action also
 * being part of a CHECK (error 3823: the SET NULL could otherwise put an
 * existing row in violation outside of normal DML). So this is the one
 * place that rule is actually enforced — called before every order is
 * created, regardless of source.
 */
function assertHasContact({ userId, guestName, guestPhone }) {
  const hasUser = userId !== null && userId !== undefined;
  const hasGuestContact = Boolean(guestName) && Boolean(guestPhone);
  if (!hasUser && !hasGuestContact) {
    throw ApiError.badRequest('An order needs either a signed-in customer or a guest name and phone number');
  }
}

export const ordersService = {
  /**
   * Public, unauthenticated — the /try conversion flow. No SMS/WhatsApp
   * provider is connected yet (Phase 2), so this only ever creates a real
   * `pending` order row; it never claims a message was sent. The unit
   * price always comes from the template's own pricing tier, computed
   * here — a client-supplied price or tier is never trusted.
   */
  async submitTryService({ name, phone, templateId, quantity }, requestMeta) {
    const template = await templateRepository.findActiveById(templateId);
    if (!template) {
      throw ApiError.badRequest('The selected card is not available');
    }

    const tier = getPricingTier(template.pricing_tier || DEFAULT_PRICING_TIER);
    const qty = Number(quantity) || 1;
    const unitPriceTzs = tier.priceTzs;
    const subtotalTzs = unitPriceTzs * qty;

    const guestName = name.trim();
    const guestPhone = phone.trim();
    assertHasContact({ userId: null, guestName, guestPhone });

    const order = await orderRepository.create({
      userId: null,
      templateId: template.id,
      guestName,
      guestPhone,
      pricingTier: tier.id,
      unitPriceTzs,
      quantity: qty,
      subtotalTzs,
      source: ORDER_SOURCE.TRY_SERVICE,
      notes: null,
    });

    await auditLogRepository.record({
      userId: null,
      action: 'order.try_service_submitted',
      entityType: 'order',
      entityId: order.id,
      metadata: { templateId: template.id, pricingTier: tier.id, quantity: qty },
      ipAddress: requestMeta?.ipAddress,
      userAgent: requestMeta?.userAgent,
    });

    return toOrderDTO(order);
  },

  async listMine(userId, { page, limit }) {
    const pagination = parsePagination({ page, limit });
    const { rows, total } = await orderRepository.findAllByUserId({
      userId,
      limit: pagination.limit,
      offset: pagination.offset,
    });

    return {
      orders: rows.map(toOrderDTO),
      pagination: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, total }),
    };
  },

  async getMine(userId, id) {
    const order = await orderRepository.findByIdAndUserId(id, userId);
    if (!order) throw ApiError.notFound('Order not found');
    return toOrderDTO(order);
  },
};
