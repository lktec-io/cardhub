import { getPublicOrderUrl } from './publicUrl.js';

/**
 * A stable, human-facing display number derived from the order's own
 * auto-increment id (never re-derived differently later, since the id
 * never changes) — offset so it doesn't read as "the 1st row ever
 * created" the way a raw id of 1, 2, 3... would.
 */
function toInvitationNumber(id) {
  return String(1000 + Number(id));
}

/** Owner-facing / self-service DTO — used for a customer's own order list and the /try confirmation. */
export function toOrderDTO(row) {
  return {
    id: row.id,
    invitationNumber: toInvitationNumber(row.id),
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
    publicUrl: row.rsvp_code ? getPublicOrderUrl(row.rsvp_code) : row.public_token ? getPublicOrderUrl(row.public_token) : null,
    source: row.source,
    guestName: row.guest_name,
    guestPhone: row.guest_phone,
    eventType: row.event_type,
    eventName: row.event_name,
    venue: row.venue,
    eventDate: row.event_date,
    eventTime: row.event_time,
    guestType: row.guest_type,
    rsvpStatus: row.rsvp_status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Admin DTO — adds the registered customer's identity when the order is
 * tied to an account, plus the most recent payment's admin-relevant
 * fields (method/provider reference/paid date) when one is passed in.
 * Never includes the raw provider webhook payload — read-only summary
 * fields only, per the "no unnecessary admin complexity" instruction.
 */
export function toAdminOrderDTO(row, payment) {
  return {
    ...toOrderDTO(row),
    customer: row.user_id ? { id: row.user_id, name: row.user_name, email: row.user_email } : null,
    payment: payment
      ? {
          method: payment.method,
          provider: payment.provider,
          providerReference: payment.provider_reference,
          status: payment.status,
          paidAt: payment.paid_at,
        }
      : null,
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
    invitationNumber: toInvitationNumber(row.id),
    template: row.template_id
      ? { name: row.template_name, slug: row.template_slug, previewImage: row.template_preview_image }
      : null,
    guestName: row.guest_name,
    pricingTier: row.pricing_tier,
    unitPriceTzs: row.unit_price_tzs,
    quantity: row.quantity,
    status: row.status,
    paymentStatus: row.payment_status,
    eventType: row.event_type,
    eventName: row.event_name,
    venue: row.venue,
    eventDate: row.event_date,
    eventTime: row.event_time,
    guestType: row.guest_type,
    rsvpStatus: row.rsvp_status,
    publicUrl: row.rsvp_code ? getPublicOrderUrl(row.rsvp_code) : row.public_token ? getPublicOrderUrl(row.public_token) : null,
    createdAt: row.created_at,
  };
}
