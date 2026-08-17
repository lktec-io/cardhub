import { Router } from 'express';
import { notImplemented } from '../../middleware/notImplemented.js';

export const invitationsRouter = Router();

invitationsRouter.use(notImplemented('Invitations'));
