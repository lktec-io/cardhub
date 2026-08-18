import { Router } from 'express';
import { ordersController } from '../../controllers/orders.controller.js';
import { authenticate } from '../../middleware/authenticate.js';

export const ordersRouter = Router();

// A customer's own orders only — scoped to req.user.id, same pattern as
// the events/guests ownership model. There is no admin-only listing here;
// that lives under /admin/orders (admin.routes.js).
ordersRouter.use(authenticate);

ordersRouter.get('/', ordersController.list);
ordersRouter.get('/:id', ordersController.getOne);
