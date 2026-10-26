import { Router } from 'express';
import { adminController } from '../../controllers/admin.controller.js';
import { adminContentController } from '../../controllers/adminContent.controller.js';
import { adminTicketEventsController } from '../../controllers/adminTicketEvents.controller.js';
import { adminDeletionController } from '../../controllers/adminDeletion.controller.js';
import { singleMediaUpload } from '../../middleware/mediaUpload.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { checkInLimiter, writeLimiter } from '../../middleware/rateLimiter.js';
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

adminRouter.get('/payments', adminController.listPayments);
adminRouter.get('/payments/:id', adminController.getPayment);

adminRouter.get('/audit-logs', adminController.listAuditLogs);

// ---- Invitation card catalogue (event_templates) ----
adminRouter.get('/cards', adminContentController.listCards);
adminRouter.post('/cards', writeLimiter, singleMediaUpload('image', 'image'), adminContentController.createCard);
adminRouter.put('/cards/order', writeLimiter, adminContentController.reorderCards);
adminRouter.put('/cards/:id', writeLimiter, adminContentController.updateCard);
adminRouter.post('/cards/:id/image', writeLimiter, singleMediaUpload('image', 'image'), adminContentController.replaceCardImage);
adminRouter.delete('/cards/:id', writeLimiter, adminContentController.deleteCard);

// ---- Promotional media (videos) ----
adminRouter.get('/media', adminContentController.listMedia);
adminRouter.post('/media/videos', writeLimiter, singleMediaUpload('file', 'video'), adminContentController.createVideo);
adminRouter.put('/media/order', writeLimiter, adminContentController.reorderMedia);
adminRouter.put('/media/:id', writeLimiter, adminContentController.updateMedia);
adminRouter.post('/media/:id/poster', writeLimiter, singleMediaUpload('image', 'image'), adminContentController.replaceMediaPoster);
adminRouter.delete('/media/:id', writeLimiter, adminContentController.deleteMedia);

// ---- Events & tickets ----
adminRouter.get('/ticket-events', adminTicketEventsController.list);
adminRouter.post('/ticket-events', writeLimiter, adminTicketEventsController.create);
adminRouter.get('/ticket-events/:id', adminTicketEventsController.get);
adminRouter.put('/ticket-events/:id', writeLimiter, adminTicketEventsController.updateDetails);
adminRouter.post('/ticket-events/:id/poster', writeLimiter, singleMediaUpload('image', 'image'), adminTicketEventsController.uploadPoster);
adminRouter.post('/ticket-events/:id/publish', writeLimiter, adminTicketEventsController.publish);
adminRouter.post('/ticket-events/:id/unpublish', writeLimiter, adminTicketEventsController.unpublish);
adminRouter.put('/ticket-events/:id/tickets', writeLimiter, adminTicketEventsController.saveTickets);
adminRouter.get('/ticket-events/:id/orders', adminTicketEventsController.orders);
adminRouter.get('/ticket-events/:id/tickets', adminTicketEventsController.tickets);
adminRouter.get('/ticket-events/:id/check-in-stats', adminTicketEventsController.checkInStats);

// ---- Door scanner (Scan & verify) ----
adminRouter.post('/tickets/check-in', checkInLimiter, adminTicketEventsController.checkIn);

// ---- Hard deletes (admin only; each re-checks eligibility server-side in a transaction) ----
adminRouter.get('/events/:id/delete-preview', adminDeletionController.previewEvent);
adminRouter.delete('/events/:id', writeLimiter, adminDeletionController.deleteEvent);
adminRouter.delete('/ticket-orders/:id', writeLimiter, adminDeletionController.deleteTicketOrder);
adminRouter.post('/tickets/:id/cancel', writeLimiter, adminDeletionController.cancelTicket);
adminRouter.delete('/orders/:id', writeLimiter, adminDeletionController.deleteCardOrder);
adminRouter.delete('/users/:id', writeLimiter, adminDeletionController.deleteUser);
adminRouter.delete('/audit-logs/:id', writeLimiter, adminDeletionController.deleteAuditLog);
adminRouter.get('/audit-logs/purge-preview', adminDeletionController.previewAuditPurge);
adminRouter.post('/audit-logs/purge', writeLimiter, adminDeletionController.purgeAuditLogs);
adminRouter.get('/security-events', adminDeletionController.securityEvents);
