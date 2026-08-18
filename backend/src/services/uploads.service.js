import { ApiError } from '../utils/ApiError.js';
import { imageStorageProvider } from './providers/imageStorageProvider.js';

const ALLOWED_PURPOSES = ['cover', 'background', 'gallery'];

/** Honest placeholder — see docs/production.md "Payment, email, and SMS provider status" for the same pattern applied to images. Never fakes a successful upload. */
export const uploadsService = {
  async uploadImage(file, { purpose, userId }) {
    if (!file) {
      throw ApiError.badRequest('No image file was provided');
    }
    if (!purpose || !ALLOWED_PURPOSES.includes(purpose)) {
      throw ApiError.validation([{ field: 'purpose', message: `purpose must be one of: ${ALLOWED_PURPOSES.join(', ')}` }]);
    }
    if (!imageStorageProvider.isConfigured) {
      throw ApiError.badRequest(
        'Image storage is not connected yet. Continue using an image URL for now — direct upload is coming in Phase 2.'
      );
    }

    return imageStorageProvider.uploadImage(
      { buffer: file.buffer, mimeType: file.mimetype, sizeBytes: file.size, originalName: file.originalname },
      { purpose, userId }
    );
  },
};
