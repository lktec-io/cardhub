import { randomBytes } from 'node:crypto';

// Crockford base32: no I, L, O or U, so a code read aloud over the phone
// or typed at the door can't be confused (0/O, 1/I/L). 32 symbols means
// `byte & 31` maps every random byte with no modulo bias.
const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** Human-facing ticket ID, e.g. `CH-7K3MQ9XA` (40 random bits). Never derived from the row id. */
export function generateTicketCode() {
  const bytes = randomBytes(8);
  let code = '';
  for (const byte of bytes) code += CODE_ALPHABET[byte & 31];
  return `CH-${code}`;
}

/** The QR/verification secret: 256 random bits, URL-safe (43 chars). */
export function generateTicketToken() {
  return randomBytes(32).toString('base64url');
}

/** The buyer's private key for their order/checkout page (192 random bits, 32 chars). */
export function generateTicketOrderToken() {
  return randomBytes(24).toString('base64url');
}

export const TICKET_TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
export const TICKET_ORDER_TOKEN_RE = /^[A-Za-z0-9_-]{32}$/;
