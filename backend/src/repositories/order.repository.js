import { pool } from '../config/db.js';

const ORDER_SELECT = `
  SELECT o.*, et.name AS template_name, et.slug AS template_slug, et.preview_image AS template_preview_image
  FROM orders o
  LEFT JOIN event_templates et ON et.id = o.template_id
`;

export const orderRepository = {
  async create({
    userId,
    templateId,
    guestName,
    guestPhone,
    pricingTier,
    unitPriceTzs,
    quantity,
    subtotalTzs,
    source,
    notes,
    publicToken,
  }) {
    const [result] = await pool.query(
      `INSERT INTO orders
         (user_id, template_id, guest_name, guest_phone, pricing_tier, unit_price_tzs, quantity, subtotal_tzs, source, notes, public_token)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId ?? null,
        templateId ?? null,
        guestName ?? null,
        guestPhone ?? null,
        pricingTier,
        unitPriceTzs,
        quantity,
        subtotalTzs,
        source,
        notes ?? null,
        publicToken ?? null,
      ]
    );
    return this.findById(result.insertId);
  },

  async findById(id) {
    const [rows] = await pool.query(`${ORDER_SELECT} WHERE o.id = ? LIMIT 1`, [id]);
    return rows[0] || null;
  },

  /** Public, unauthenticated lookup — the order confirmation page reached via SMS/WhatsApp. Never by sequential id. */
  async findByPublicToken(token) {
    const [rows] = await pool.query(`${ORDER_SELECT} WHERE o.public_token = ? LIMIT 1`, [token]);
    return rows[0] || null;
  },

  async findByIdAndUserId(id, userId) {
    const [rows] = await pool.query(`${ORDER_SELECT} WHERE o.id = ? AND o.user_id = ? LIMIT 1`, [id, userId]);
    return rows[0] || null;
  },

  async findAllByUserId({ userId, limit, offset }) {
    const [rows] = await pool.query(
      `${ORDER_SELECT} WHERE o.user_id = ? ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    const [countRows] = await pool.query('SELECT COUNT(*) AS total FROM orders WHERE user_id = ?', [userId]);
    return { rows, total: countRows[0].total };
  },

  async findAllAdmin({ limit, offset, status, search }) {
    const conditions = [];
    const params = [];

    if (status) {
      conditions.push('o.status = ?');
      params.push(status);
    }
    if (search) {
      conditions.push(
        "(o.guest_name LIKE ? ESCAPE '\\\\' OR o.guest_phone LIKE ? ESCAPE '\\\\' OR u.name LIKE ? ESCAPE '\\\\' OR u.phone LIKE ? ESCAPE '\\\\')"
      );
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `SELECT o.*, et.name AS template_name, et.slug AS template_slug, u.name AS user_name, u.email AS user_email
       FROM orders o
       LEFT JOIN event_templates et ON et.id = o.template_id
       LEFT JOIN users u ON u.id = o.user_id
       ${whereClause}
       ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM orders o LEFT JOIN users u ON u.id = o.user_id ${whereClause}`,
      params
    );

    return { rows, total: countRows[0].total };
  },

  async findAllByUserIdForAdmin(userId) {
    const [rows] = await pool.query(`${ORDER_SELECT} WHERE o.user_id = ? ORDER BY o.created_at DESC`, [userId]);
    return rows;
  },

  async updateStatusFields(id, { status, paymentStatus, deliveryStatus }) {
    const sets = [];
    const params = [];
    if (status) {
      sets.push('status = ?');
      params.push(status);
    }
    if (paymentStatus) {
      sets.push('payment_status = ?');
      params.push(paymentStatus);
    }
    if (deliveryStatus) {
      sets.push('delivery_status = ?');
      params.push(deliveryStatus);
    }
    if (!sets.length) return this.findById(id);

    params.push(id);
    await pool.query(`UPDATE orders SET ${sets.join(', ')} WHERE id = ?`, params);
    return this.findById(id);
  },

  /** Persists a delivery.service.js result — the overall status plus each requested channel's independent state. */
  async updateDeliveryResult(
    id,
    { deliveryStatus, smsStatus, smsProviderMessageId, smsError, whatsappStatus, whatsappProviderMessageId, whatsappError }
  ) {
    await pool.query(
      `UPDATE orders SET
         delivery_status = ?,
         sms_status = ?, sms_provider_message_id = ?, sms_error = ?,
         whatsapp_status = ?, whatsapp_provider_message_id = ?, whatsapp_error = ?
       WHERE id = ?`,
      [
        deliveryStatus,
        smsStatus,
        smsProviderMessageId ?? null,
        smsError ?? null,
        whatsappStatus,
        whatsappProviderMessageId ?? null,
        whatsappError ?? null,
        id,
      ]
    );
    return this.findById(id);
  },

  async countAll() {
    const [rows] = await pool.query('SELECT COUNT(*) AS total FROM orders');
    return rows[0].total;
  },

  async countByStatus(status) {
    const [rows] = await pool.query('SELECT COUNT(*) AS total FROM orders WHERE status = ?', [status]);
    return rows[0].total;
  },

  /** "Cards sold" counts quantity on completed orders only — a real fulfilled sale, not a pending cart. */
  async sumCardsSold() {
    const [rows] = await pool.query("SELECT COALESCE(SUM(quantity), 0) AS total FROM orders WHERE status = 'completed'");
    return Number(rows[0].total);
  },

  async sumRevenue() {
    const [rows] = await pool.query("SELECT COALESCE(SUM(subtotal_tzs), 0) AS total FROM orders WHERE payment_status = 'paid'");
    return Number(rows[0].total);
  },
};
