import { Router } from 'express';
import { notImplemented } from '../../middleware/notImplemented.js';

export const rsvpRouter = Router();

rsvpRouter.use(notImplemented('RSVP'));
