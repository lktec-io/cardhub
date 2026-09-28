import { Router } from 'express';
import { ticketsController } from '../../controllers/tickets.controller.js';
import { ticketCheckoutLimiter, ticketVerifyLimiter } from '../../middleware/rateLimiter.js';

export const ticketsRouter = Router();

// Public ticket marketplace. No authentication: buyers check out as
// guests. Orders are addressed by their random public token and tickets
// by their random ticket token, never by a sequential id.
ticketsRouter.get('/events', ticketsController.listEvents);
ticketsRouter.get('/events/:slug', ticketsController.getEvent);

ticketsRouter.post('/orders', ticketCheckoutLimiter, ticketsController.createOrder);
ticketsRouter.get('/orders/:token', ticketsController.getOrder);
ticketsRouter.post('/orders/:token/pay', ticketCheckoutLimiter, ticketsController.startPayment);
// DEMO PAYMENT MODE only (the service refuses otherwise). A real
// provider's payments are settled only by POST /payments/webhook.
ticketsRouter.post('/orders/:token/demo-confirm', ticketCheckoutLimiter, ticketsController.confirmDemoPayment);

ticketsRouter.get('/pass/:token', ticketsController.getTicket);

// Door verification. Returns VALID/INVALID. A future scanner/check-in
// module (event_staff role) builds on this.
ticketsRouter.get('/verify/:token', ticketVerifyLimiter, ticketsController.verify);
