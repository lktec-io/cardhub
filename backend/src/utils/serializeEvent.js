import { getPricingTier } from '../constants/pricingTiers.js';

function safeParseConfig(config) {
  if (!config) return null;
  if (typeof config === 'object') return config;
  try {
    return JSON.parse(config);
  } catch {
    return null;
  }
}

/** Owner-facing DTO — used by the dashboard (My Events, event workspace, builder). Not safe for anonymous callers. */
export function toEventDTO(row) {
  return {
    id: row.id,
    title: row.title,
    eventType: row.event_type,
    status: row.status,
    slug: row.slug,
    eventDate: row.event_date,
    eventTime: row.event_time,
    timezone: row.timezone,
    venue: {
      name: row.venue_name,
      address: row.venue_address,
    },
    description: row.description,
    hostName: row.host_name,
    coverImage: row.cover_image,
    invitationConfig: safeParseConfig(row.invitation_config),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    template: {
      id: row.template_id,
      name: row.template_name,
      category: row.template_category,
      status: row.template_status,
      config: safeParseConfig(row.template_config),
    },
  };
}

export function toPublicTemplate(row) {
  const tier = getPricingTier(row.pricing_tier);
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    category: row.category,
    status: row.status,
    previewImage: row.preview_image,
    // Always computed here from the template's assigned tier — never a
    // client-supplied or hardcoded-in-a-component number. See
    // constants/pricingTiers.js.
    pricingTier: tier.id,
    priceTzs: tier.priceTzs,
    config: safeParseConfig(row.config),
    createdAt: row.created_at,
  };
}

/**
 * Anonymous-safe DTO for the public invitation page. Deliberately excludes
 * id, user_id, status, timestamps, template id/status, and anything else
 * not needed to render the invitation — see docs/architecture.md
 * "Public API data minimization".
 */
export function toPublicInvitationDTO(row) {
  return {
    title: row.title,
    hostName: row.host_name,
    eventType: row.event_type,
    eventDate: row.event_date,
    eventTime: row.event_time,
    timezone: row.timezone,
    venue: {
      name: row.venue_name,
      address: row.venue_address,
    },
    description: row.description,
    invitation: safeParseConfig(row.invitation_config),
    template: {
      category: row.template_category,
      config: safeParseConfig(row.template_config),
    },
  };
}
