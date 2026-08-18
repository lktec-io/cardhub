import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

const isConfigured = Boolean(env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret);

/**
 * Storage provider abstraction, not a working uploader. No Cloudinary (or
 * other) credentials exist in this environment and none were invented.
 * The invitation builder still uses paste-a-URL fields
 * (utils/safeImageUrl.js) — this exists alongside that, unwired, so Phase 2
 * can plug in a real provider behind this same interface without touching
 * the upload route, the multer validation, or the InvitationRenderer.
 *
 * Every caller must handle `{ status: 'unavailable' }`. This never
 * resolves as a successful upload unless a real provider is wired in.
 */
export const imageStorageProvider = {
  isConfigured,

  /** file: { buffer, mimeType, sizeBytes, originalName }, meta: { purpose, userId } */
  async uploadImage(file, meta) {
    if (!isConfigured) {
      logger.warn('Image upload unavailable — no storage provider configured', {
        purpose: meta?.purpose,
        sizeBytes: file?.sizeBytes,
      });
      return { status: 'unavailable' };
    }

    // Real transport (e.g. the Cloudinary SDK) would be wired in here once
    // CLOUDINARY_CLOUD_NAME/CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET are
    // actually configured.
    throw new Error('Image storage provider is configured but no transport implementation exists yet');
  },

  async deleteImage(storageKey) {
    if (!isConfigured) {
      logger.warn('Image delete unavailable — no storage provider configured', { storageKey });
      return { status: 'unavailable' };
    }
    throw new Error('Image storage provider is configured but no transport implementation exists yet');
  },

  /** Resolves a stored reference to a public URL. Unconfigured storage has no URL to give. */
  getImageUrl(_storageKey) {
    if (!isConfigured) return null;
    throw new Error('Image storage provider is configured but no transport implementation exists yet');
  },
};
