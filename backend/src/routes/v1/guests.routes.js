import { Router } from 'express';
import { guestsController } from '../../controllers/guests.controller.js';
import { writeLimiter } from '../../middleware/rateLimiter.js';

// mergeParams so this nested router (mounted at /events/:id/guests) can
// read :id from the parent route — guests only ever exist through an event.
export const guestsRouter = Router({ mergeParams: true });

guestsRouter.get('/', guestsController.list);
guestsRouter.get('/stats', guestsController.stats);
guestsRouter.post('/', writeLimiter, guestsController.create);
guestsRouter.post('/bulk-delete', writeLimiter, guestsController.bulkRemove);
guestsRouter.post('/bulk-import', writeLimiter, guestsController.bulkImport);
guestsRouter.get('/:guestId', guestsController.getOne);
guestsRouter.patch('/:guestId', writeLimiter, guestsController.update);
guestsRouter.delete('/:guestId', writeLimiter, guestsController.remove);
