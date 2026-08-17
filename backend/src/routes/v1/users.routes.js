import { Router } from 'express';
import { usersController } from '../../controllers/users.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { notImplemented } from '../../middleware/notImplemented.js';

export const usersRouter = Router();

usersRouter.use(authenticate);

usersRouter.patch('/me', usersController.updateMe);
usersRouter.patch('/me/password', usersController.changePassword);
usersRouter.get('/me/preferences', usersController.getPreferences);
usersRouter.patch('/me/preferences', usersController.updatePreferences);

// Anything else under /users (listing, admin lookups by id, ...) is a
// later-phase, admin-facing capability.
usersRouter.use(notImplemented('Users'));
