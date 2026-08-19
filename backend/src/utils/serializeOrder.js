import { getPublicOrderUrl } from './publicUrl.js';

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
    sms: { status: row.sms_status, providerMessageId: row.sms_provider_message_id, error: row.sms_error },
    whatsapp: { status: row.whatsapp_status, providerMessageId: row.whatsapp_provider_message_id, error: row.whatsapp_error },
    publicUrl: row.public_token ? getPublicOrderUrl(row.public_token) : null,
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

/**
 * Public, anonymous-safe DTO for the order confirmation page reached via
 * the link sent over SMS/WhatsApp (`GET /public/orders/:token`).
 * Deliberately excludes the phone number, internal id, and anything not
 * needed to show "here is your card" — same data-minimization principle
 * as toPublicInvitationDTO (see docs/architecture.md).
 */
export function toPublicOrderCardDTO(row) {
  return {
    template: row.template_id
      ? { name: row.template_name, slug: row.template_slug, previewImage: row.template_preview_image }
      : null,
    guestName: row.guest_name,
    pricingTier: row.pricing_tier,
    unitPriceTzs: row.unit_price_tzs,
    quantity: row.quantity,
    status: row.status,
    paymentStatus: row.payment_status,
    createdAt: row.created_at,
  };
}
