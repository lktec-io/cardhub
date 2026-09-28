/**
 * Client-side helpers for the ticket checkout. The validation here is
 * for instant feedback only. The API re-validates everything
 * (backend/src/validators/tickets.validator.js) and computes all prices.
 */

// Mirrors backend/src/utils/phone.js#normalizePhoneForDelivery.
export function normalizeTzPhone(input) {
  if (!input) return null;
  const value = String(input).trim().replace(/[\s\-()]/g, '');
  if (/^\+255[67]\d{8}$/.test(value)) return value;
  if (/^255[67]\d{8}$/.test(value)) return `+${value}`;
  if (/^0[67]\d{8}$/.test(value)) return `+255${value.slice(1)}`;
  if (/^[67]\d{8}$/.test(value)) return `+255${value}`;
  if (/^\+[1-9]\d{7,14}$/.test(value)) return value;
  return null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Returns { field: messageKey } for the buyer form. */
export function validateBuyer({ name, phone, email }) {
  const errors = {};
  const trimmedName = name.trim().replace(/\s+/g, ' ');
  if (trimmedName.length < 3 || !/\p{L}/u.test(trimmedName)) errors.buyerName = 'tix.errors.name';
  if (!normalizeTzPhone(phone)) errors.buyerPhone = 'tix.errors.phone';
  if (email.trim() && !EMAIL_RE.test(email.trim())) errors.buyerEmail = 'tix.errors.email';
  return errors;
}

function randomKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function readSession(key) {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSession(key, value) {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable (private mode). Duplicate protection still holds within this page view.
  }
}

/**
 * The idempotency key for a checkout submission. The same details reuse
 * the same key, even across a refresh, so a resubmit returns the order
 * already created instead of reserving tickets twice. Changed details get
 * a new key. The signature is a local comparison value only: it stays in
 * this tab's sessionStorage and is never sent anywhere.
 */
export function getCheckoutKey(slug, signature) {
  const storageKey = `ch.tix.checkout.${slug}`;
  const saved = readSession(storageKey);
  if (saved?.signature === signature && saved.key) return saved.key;
  const key = randomKey();
  writeSession(storageKey, { signature, key });
  return key;
}

/** Remembers this tab's open order for an event, so the event page can offer "continue to payment" after a refresh. */
export function rememberOrder(slug, token) {
  writeSession(`ch.tix.order.${slug}`, token ? { token } : null);
}

export function recallOrder(slug) {
  return readSession(`ch.tix.order.${slug}`)?.token || null;
}
