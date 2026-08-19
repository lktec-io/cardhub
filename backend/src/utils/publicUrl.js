import { env } from '../config/env.js';

/**
 * Resolves the absolute, public HTTPS URLs the delivery providers (SMS,
 * WhatsApp) are allowed to send — never a client-supplied URL (see
 * orders.service.js, which never accepts an image/card URL from the
 * request body; these are always derived server-side from the resolved
 * template).
 */

/** The order confirmation page a customer receives via SMS/WhatsApp — keyed by the order's unguessable public_token, never its sequential id. */
export function getPublicOrderUrl(publicToken) {
  return `${env.frontendUrl}/card/${publicToken}`;
}

/**
 * The card's image, as an absolute HTTPS URL external providers (Meta
 * WhatsApp Cloud API) can fetch. Built-in catalogue templates are
 * frontend-owned static assets (public/cards/{slug}.jpg — see
 * public/cards/README.md and TemplateThumb.jsx, the same resolution
 * order as the catalogue UI); a template with a real backend-supplied
 * previewImage (e.g. a future Cloudinary-hosted upload) is preferred
 * when present. Either way this always resolves to `${frontendUrl}/...`
 * — never localhost/127.0.0.1, an internal filesystem path, or a
 * Cloudinary credential.
 */
export function getPublicCardImageUrl(template) {
  if (template.previewImage) {
    return toAbsoluteUrl(template.previewImage);
  }
  if (template.slug) {
    return `${env.frontendUrl}/cards/${template.slug}.jpg`;
  }
  return null;
}

function toAbsoluteUrl(value) {
  if (/^https?:\/\//i.test(value)) return value;
  const path = value.startsWith('/') ? value : `/${value}`;
  return `${env.frontendUrl}${path}`;
}
