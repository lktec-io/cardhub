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
