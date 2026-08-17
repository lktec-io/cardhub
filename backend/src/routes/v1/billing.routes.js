import { Router } from 'express';
import { billingController } from '../../controllers/billing.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { writeLimiter } from '../../middleware/rateLimiter.js';

export const billingRouter = Router();

billingRouter.use(authenticate);

billingRouter.get('/me', billingController.getSummary);
billingRouter.post('/upgrade', writeLimiter, billingController.startUpgrade);
