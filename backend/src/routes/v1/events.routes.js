import { Router } from 'express';
import { eventsController } from '../../controllers/events.controller.js';
import { invitationController } from '../../controllers/invitation.controller.js';
import { guestsRouter } from './guests.routes.js';
import { authenticate } from '../../middleware/authenticate.js';
import { writeLimiter } from '../../middleware/rateLimiter.js';

export const eventsRouter = Router();

eventsRouter.use(authenticate);

eventsRouter.get('/', eventsController.list);
eventsRouter.post('/', writeLimiter, eventsController.create);
eventsRouter.get('/:id', eventsController.getOne);
eventsRouter.patch('/:id', writeLimiter, eventsController.update);
eventsRouter.delete('/:id', writeLimiter, eventsController.remove);
eventsRouter.post('/:id/duplicate', writeLimiter, eventsController.duplicate);
eventsRouter.patch('/:id/template', writeLimiter, eventsController.changeTemplate);

eventsRouter.get('/:id/invitation', invitationController.getConfig);
eventsRouter.patch('/:id/invitation', writeLimiter, invitationController.updateConfig);

eventsRouter.post('/:id/publish', writeLimiter, eventsController.publish);
eventsRouter.post('/:id/unpublish', writeLimiter, eventsController.unpublish);
eventsRouter.get('/:id/analytics', eventsController.analytics);

eventsRouter.use('/:id/guests', guestsRouter);
