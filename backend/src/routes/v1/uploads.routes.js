import { Router } from 'express';
import { uploadsController } from '../../controllers/uploads.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { writeLimiter } from '../../middleware/rateLimiter.js';
import { singleImageUpload } from '../../middleware/upload.js';

export const uploadsRouter = Router();

// Foundation only — see services/providers/imageStorageProvider.js. Real
// validation (mime type, size) runs regardless of whether a storage
// provider is configured; the provider call itself honestly reports
// "not connected yet" until Phase 2 wires in real credentials.
uploadsRouter.use(authenticate);
uploadsRouter.post('/images', writeLimiter, singleImageUpload('image'), uploadsController.uploadImage);
