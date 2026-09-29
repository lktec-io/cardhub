import { ApiError } from '../utils/ApiError.js';
import { TIME_RE } from '../utils/dateTime.js';
import { isSafeImageUrl } from '../utils/safeImageUrl.js';
import { TICKET_MAX_QUANTITY_PER_ORDER, TICKET_TYPE_STATUS } from '../constants/ticketStatus.js';

export const TICKET_TIER_LIMITS = {
  maxTiers: 12,
  nameMax: 80,
  descriptionMax: 255,
  priceMin: 100,
  priceMax: 100_000_000,
  quantityMax: 100_000,
};

const CONTACT_MAX = 190;
// App-hosted assets (e.g. the demo event's /events/*.svg poster): root-relative, no protocol, no '..'.
const APP_ASSET_RE = /^\/(?!\/)(?!.*\.\.)[A-Za-z0-9_\-./]+\.(jpe?g|png|webp|svg)$/i;

function isAllowedCover(value) {
  return isSafeImageUrl(value) || APP_ASSET_RE.test(value);
}
const STATUSES = Object.values(TICKET_TYPE_STATUS);

function isPositiveInt(value, max) {
  return Number.isInteger(value) && value >= 1 && value <= max;
}

/**
 * Event Workspace → Tickets save payload. The whole ticket setup is sent
 * at once (sales switch, cover, organizer contact, end time, every tier),
 * so the server can validate it as a unit and apply it in one transaction.
 * Field errors are keyed `tiers.<index>.<field>` so the form can place
 * each message next to the right input.
 */
export function validateTicketSettingsPayload(body = {}) {
  const details = [];
  const { ticketSalesEnabled, coverImage, organizerContact, endTime, tiers } = body;

  if (typeof ticketSalesEnabled !== 'boolean') {
    details.push({ field: 'ticketSalesEnabled', message: 'Choose whether ticket sales are on or off' });
  }

  let cover = null;
  if (coverImage !== undefined && coverImage !== null && coverImage !== '') {
    cover = typeof coverImage === 'string' ? coverImage.trim() : '';
    if (!isAllowedCover(cover)) {
      details.push({ field: 'coverImage', message: 'Use an https image link ending in .jpg, .png or .webp' });
    }
  }

  let contact = null;
  if (organizerContact !== undefined && organizerContact !== null && organizerContact !== '') {
    contact = typeof organizerContact === 'string' ? organizerContact.trim() : '';
    if (!contact || contact.length > CONTACT_MAX || /[<>]/.test(contact)) {
      details.push({ field: 'organizerContact', message: 'Enter a phone number or email (up to 190 characters)' });
    }
  }

  let end = null;
  if (endTime !== undefined && endTime !== null && endTime !== '') {
    end = typeof endTime === 'string' ? endTime : '';
    if (!TIME_RE.test(end)) details.push({ field: 'endTime', message: 'Use a 24-hour time, e.g. 23:30' });
  }

  if (!Array.isArray(tiers)) {
    details.push({ field: 'tiers', message: 'Ticket tiers are missing' });
    throw ApiError.validation(details);
  }
  if (tiers.length > TICKET_TIER_LIMITS.maxTiers) {
    details.push({ field: 'tiers', message: `You can add up to ${TICKET_TIER_LIMITS.maxTiers} ticket tiers` });
  }

  const seenNames = new Map();
  const normalizedTiers = tiers.map((tier, index) => {
    const at = (field) => `tiers.${index}.${field}`;
    const id = tier?.id === undefined || tier?.id === null ? null : Number(tier.id);
    if (id !== null && !isPositiveInt(id, Number.MAX_SAFE_INTEGER)) details.push({ field: at('id'), message: 'Invalid ticket tier' });

    const name = typeof tier?.name === 'string' ? tier.name.trim().replace(/\s+/g, ' ') : '';
    if (name.length < 2 || name.length > TICKET_TIER_LIMITS.nameMax || /[<>]/.test(name)) {
      details.push({ field: at('name'), message: 'Enter a tier name (2–80 characters)' });
    } else {
      const key = name.toLocaleLowerCase();
      if (seenNames.has(key)) details.push({ field: at('name'), message: `"${name}" is already used by another tier` });
      seenNames.set(key, index);
    }

    const description = typeof tier?.description === 'string' ? tier.description.trim() : '';
    if (description.length > TICKET_TIER_LIMITS.descriptionMax || /[<>]/.test(description)) {
      details.push({ field: at('description'), message: 'Keep the description under 255 characters' });
    }

    const priceTzs = Number(tier?.priceTzs);
    if (!Number.isInteger(priceTzs) || priceTzs < TICKET_TIER_LIMITS.priceMin || priceTzs > TICKET_TIER_LIMITS.priceMax) {
      details.push({ field: at('priceTzs'), message: `Enter a whole-shilling price of at least TSh ${TICKET_TIER_LIMITS.priceMin}` });
    }

    const quantityAvailable = Number(tier?.quantityAvailable);
    if (!isPositiveInt(quantityAvailable, TICKET_TIER_LIMITS.quantityMax)) {
      details.push({ field: at('quantityAvailable'), message: `Enter a quantity between 1 and ${TICKET_TIER_LIMITS.quantityMax.toLocaleString('en-US')}` });
    }

    const maxPerOrder = tier?.maxPerOrder === undefined || tier?.maxPerOrder === '' ? 10 : Number(tier.maxPerOrder);
    if (!isPositiveInt(maxPerOrder, TICKET_MAX_QUANTITY_PER_ORDER)) {
      details.push({ field: at('maxPerOrder'), message: `Allow between 1 and ${TICKET_MAX_QUANTITY_PER_ORDER} per order` });
    }

    const status = tier?.status === undefined ? TICKET_TYPE_STATUS.ACTIVE : tier.status;
    if (!STATUSES.includes(status)) details.push({ field: at('status'), message: 'Invalid tier status' });

    return { id, name, description: description || null, priceTzs, quantityAvailable, maxPerOrder, status, sortOrder: index + 1 };
  });

  if (details.length) throw ApiError.validation(details);

  return { ticketSalesEnabled, coverImage: cover, organizerContact: contact, endTime: end, tiers: normalizedTiers };
}
