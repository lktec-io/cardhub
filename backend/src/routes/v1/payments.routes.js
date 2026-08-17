import { Router } from 'express';
import { paymentsController } from '../../controllers/payments.controller.js';

export const paymentsRouter = Router();

// No JWT — providers authenticate webhooks via signature, not a bearer token.
paymentsRouter.post('/webhook', paymentsController.webhook);
