import { Router } from 'express';
import { notificationsController } from '../../controllers/notifications.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { writeLimiter } from '../../middleware/rateLimiter.js';

export const notificationsRouter = Router();

notificationsRouter.use(authenticate);

notificationsRouter.get('/', notificationsController.list);
notificationsRouter.get('/unread-count', notificationsController.unreadCount);
notificationsRouter.post('/read-all', writeLimiter, notificationsController.markAllRead);
notificationsRouter.patch('/:id/read', writeLimiter, notificationsController.markRead);
