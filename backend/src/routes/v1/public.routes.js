import { Router } from 'express';
import { publicController } from '../../controllers/public.controller.js';
import { publicRsvpController } from '../../controllers/publicRsvp.controller.js';
import { rsvpLimiter } from '../../middleware/rateLimiter.js';

export const publicRouter = Router();

// No authentication — this is the anonymous, visitor-facing surface.
// Deliberately a separate module from events.routes.js so the
// owner-facing event API can evolve without risking public exposure.
publicRouter.get('/invitations/:slug', publicController.getInvitation);
publicRouter.post('/invitations/:slug/rsvp', rsvpLimiter, publicRsvpController.submit);
