import { Router } from 'express';
import { adminController } from '../../controllers/admin.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { writeLimiter } from '../../middleware/rateLimiter.js';
import { ROLES } from '../../constants/roles.js';

export const adminRouter = Router();

adminRouter.use(authenticate, authorize(ROLES.ADMIN));

adminRouter.get('/stats', adminController.stats);

adminRouter.get('/users', adminController.listUsers);
adminRouter.get('/users/:id', adminController.getUser);
adminRouter.patch('/users/:id/status', writeLimiter, adminController.updateUserStatus);

adminRouter.get('/events', adminController.listEvents);

adminRouter.get('/templates', adminController.listTemplates);
adminRouter.patch('/templates/:id/status', writeLimiter, adminController.updateTemplateStatus);
adminRouter.patch('/templates/:id/pricing-tier', writeLimiter, adminController.updateTemplatePricingTier);

adminRouter.get('/orders', adminController.listOrders);
adminRouter.get('/orders/:id', adminController.getOrder);
adminRouter.patch('/orders/:id/status', writeLimiter, adminController.updateOrderStatus);

adminRouter.get('/audit-logs', adminController.listAuditLogs);
