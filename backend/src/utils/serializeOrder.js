/** Owner-facing / self-service DTO — used for a customer's own order list and the /try confirmation. */
export function toOrderDTO(row) {
  return {
    id: row.id,
    template: row.template_id
      ? { id: row.template_id, name: row.template_name, slug: row.template_slug, previewImage: row.template_preview_image }
      : null,
    pricingTier: row.pricing_tier,
    unitPriceTzs: row.unit_price_tzs,
    quantity: row.quantity,
    subtotalTzs: row.subtotal_tzs,
    status: row.status,
    paymentStatus: row.payment_status,
    deliveryStatus: row.delivery_status,
    source: row.source,
    guestName: row.guest_name,
    guestPhone: row.guest_phone,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Admin DTO — adds the registered customer's identity when the order is tied to an account. */
export function toAdminOrderDTO(row) {
  return {
    ...toOrderDTO(row),
    customer: row.user_id ? { id: row.user_id, name: row.user_name, email: row.user_email } : null,
  };
}
