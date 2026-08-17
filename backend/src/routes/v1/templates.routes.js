import { Router } from 'express';
import { templatesController } from '../../controllers/templates.controller.js';

export const templatesRouter = Router();

// Public catalog — no authentication required, matches the Phase 2 public /templates page.
templatesRouter.get('/', templatesController.list);
templatesRouter.get('/:id', templatesController.getById);
