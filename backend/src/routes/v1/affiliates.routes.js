import { Router } from 'express';
import { notImplemented } from '../../middleware/notImplemented.js';

export const affiliatesRouter = Router();

affiliatesRouter.use(notImplemented('Affiliates'));
