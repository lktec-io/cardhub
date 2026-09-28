import rateLimit from 'express-rate-limit';
import { sendError } from '../utils/ApiResponse.js';

function limitHandler(req, res) {
  sendError(res, {
    statusCode: 429,
    code: 'TOO_MANY_REQUESTS',
    message: 'Too many requests, please try again later',
  });
}

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limitHandler,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limitHandler,
});

export const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limitHandler,
});

// Public, unauthenticated RSVP submissions — generous enough for a family
// submitting on behalf of several guests, tight enough to blunt spam/flooding.
export const rsvpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limitHandler,
});

// Public ticket checkout (create order / start payment / demo confirm).
// Looser than tryServiceLimiter: one buyer may reasonably retry payment,
// or buy for a second ticket type, within the hour.
export const ticketCheckoutLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limitHandler,
});

// Ticket verification — generous enough for a door scanner working through a queue, tight enough to stop token enumeration.
export const ticketVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 240,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limitHandler,
});

// Public, unauthenticated "Try Our Service" lead-gen submissions — tighter
// than rsvpLimiter since this is a single-visitor conversion form, not a
// household responding for several guests.
export const tryServiceLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limitHandler,
});
