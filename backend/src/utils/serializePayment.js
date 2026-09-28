/**
 * A stable, human-facing order number matching serializeOrder.js#toInvitationNumber
 * exactly (both derive from the same never-changing order.id) — kept as a
 * separate small helper here rather than importing serializeOrder.js, to
 * avoid coupling this read-only admin view to the customer-facing order DTO.
 */
function toInvitationNumber(orderId) {
  return orderId ? String(1000 + Number(orderId)) : null;
}

/**
 * Admin-only payment DTO — a safe, flat summary built explicitly field by
 * field from the joined DB row. Never spreads the raw row, so a column
 * added to `payments` later (or to a future provider-response cache) does
 * not silently leak into the API without a deliberate decision here. No
 * provider credentials are stored on this table in the first place (see
 * migration 020's comment), but this stays explicit anyway.
 */
export function toAdminPaymentDTO(row) {
  return {
    id: row.id,
    orderId: row.order_row_id ?? row.order_id ?? null,
    orderNumber: toInvitationNumber(row.order_row_id ?? row.order_id),
    // Ticket sales have no card template; the admin table's existing
    // "card" column shows "Ticket · <event> · <type>" for them instead.
    template: row.template_name
      ? { name: row.template_name }
      : row.ticket_event_title
        ? { name: `Ticket · ${row.ticket_event_title}${row.ticket_type_name ? ` · ${row.ticket_type_name}` : ''}` }
        : null,
    customer: row.order_user_id || row.user_id
      ? { name: row.user_name, email: row.user_email, phone: row.user_phone }
      : row.guest_name || row.guest_phone
        ? { name: row.guest_name, phone: row.guest_phone, guest: true }
        : row.ticket_buyer_name
          ? { name: row.ticket_buyer_name, phone: row.ticket_buyer_phone, email: row.ticket_buyer_email, guest: true }
          : null,
    ticketOrderId: row.ticket_order_row_id ?? row.ticket_order_id ?? null,
    isDemo: row.provider === 'demo',
    amount: row.amount,
    currency: row.currency,
    method: row.method,
    provider: row.provider,
    providerReference: row.provider_reference,
    status: row.status,
    failureReason: row.failure_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    paidAt: row.paid_at,
  };
}
