/**
 * Phone normalization for the delivery pipeline (SMS/WhatsApp) — separate
 * from the loose, generic PHONE_RE used elsewhere (auth/users/guests/rsvp
 * validators), which stays untouched since it already accepts a wide
 * range of formats for those existing, non-delivery use cases.
 *
 * CardHub is Tanzania-first: any recognizable local Tanzanian format is
 * normalized to canonical E.164 (+255XXXXXXXXX) so a phone number is
 * never stored/sent in more than one shape. A number that's already a
 * plausible full international number (a different country code) is
 * preserved exactly as-is — this never rewrites another country's number
 * into +255, it only fills in the +255 prefix when the input looks like
 * a bare local Tanzanian number missing it.
 */

const TZ_LOCAL_RE = /^0[67]\d{8}$/; // 0712345678 (10 digits, starts 06/07)
const TZ_BARE_RE = /^[67]\d{8}$/; // 712345678 (9 digits, no leading 0)
const TZ_COUNTRY_RE = /^255[67]\d{8}$/; // 255712345678
const TZ_INTL_RE = /^\+255[67]\d{8}$/; // +255712345678
const GENERIC_INTL_RE = /^\+[1-9]\d{7,14}$/; // any other plausible E.164 number

/** Returns the canonical +255XXXXXXXXX / +<countrycode>... form, or null if unrecognizable. */
export function normalizePhoneForDelivery(input) {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim().replace(/[\s\-()]/g, '');

  if (TZ_INTL_RE.test(trimmed)) return trimmed;
  if (TZ_COUNTRY_RE.test(trimmed)) return `+${trimmed}`;
  if (TZ_LOCAL_RE.test(trimmed)) return `+255${trimmed.slice(1)}`;
  if (TZ_BARE_RE.test(trimmed)) return `+255${trimmed}`;

  // Not a recognizable Tanzanian shape — accept it only if it's already a
  // plausible full international number (preserves international
  // capability without guessing at a country code that isn't +255).
  if (GENERIC_INTL_RE.test(trimmed)) return trimmed;

  return null;
}
