import { Router } from 'express';
import { publicController } from '../../controllers/public.controller.js';
import { publicRsvpController } from '../../controllers/publicRsvp.controller.js';
import { publicOrdersController } from '../../controllers/publicOrders.controller.js';
import { rsvpLimiter, tryServiceLimiter } from '../../middleware/rateLimiter.js';

export const publicRouter = Router();

// No authentication — this is the anonymous, visitor-facing surface.
// Deliberately a separate module from events.routes.js so the
// owner-facing event API can evolve without risking public exposure.
publicRouter.get('/invitations/:slug', publicController.getInvitation);
publicRouter.post('/invitations/:slug/rsvp', rsvpLimiter, publicRsvpController.submit);

// "Try Our Service" — real SMS/WhatsApp delivery (Phase 2). Saves a real
// order row and honestly attempts delivery; never claims a channel
// succeeded unless its provider actually accepted the message.
publicRouter.post('/orders/try', tryServiceLimiter, publicOrdersController.submitTryService);

// The order confirmation page a customer reaches via the SMS/WhatsApp
// link — keyed by the order's unguessable public_token/rsvp_code, never
// its sequential id (see utils/publicUrl.js).
publicRouter.get('/orders/:token', publicOrdersController.getByToken);

// The guest's own attendance response from that same page — same
// abuse-protection tier as the existing invitation RSVP endpoint above.
publicRouter.patch('/orders/:token/rsvp', rsvpLimiter, publicOrdersController.submitRsvp);
