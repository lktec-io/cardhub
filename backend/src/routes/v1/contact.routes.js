import { Router } from 'express';
import { contactController } from '../../controllers/contact.controller.js';
import { authLimiter } from '../../middleware/rateLimiter.js';

export const contactRouter = Router();

contactRouter.post('/', authLimiter, contactController.submit);
