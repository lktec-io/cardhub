import { v2 as cloudinary } from 'cloudinary';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

const isConfigured = Boolean(env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret);

if (isConfigured) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
    secure: true,
  });
}

/**
 * Cloudinary-backed storage provider for CUSTOMER-uploaded images (not the
 * manually-supplied catalogue images under public/cards/ — see
 * docs/architecture.md "Real card catalogue"). The Cloudinary API secret
 * lives only here, read from CLOUDINARY_API_SECRET on the backend; it is
 * never sent to, or reachable from, the React app.
 *
 * `isConfigured` gates everything: with no credentials set (the case in
 * every environment this project has run in so far), every method
 * honestly reports `{ status: 'unavailable' }` rather than faking a
 * successful upload — the same pattern as emailProvider/smsProvider/
 * paymentProvider. The transport code below only actually runs once real
 * CLOUDINARY_CLOUD_NAME/CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET values
 * are set, which has not been verified against a real Cloudinary account
 * in this environment — connecting real credentials for the first time
 * should be smoke-tested against that account before relying on it.
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

    const dataUri = `data:${file.mimeType};base64,${file.buffer.toString('base64')}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: `cardhub/${meta?.purpose || 'uploads'}`,
      resource_type: 'image',
      // Ties every uploaded asset back to the uploading customer without
      // relying on folder structure alone.
      context: meta?.userId ? { userId: String(meta.userId) } : undefined,
    });

    return {
      status: 'uploaded',
      storageKey: result.public_id,
      url: result.secure_url,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      format: result.format,
    };
  },

  async deleteImage(storageKey) {
    if (!isConfigured) {
      logger.warn('Image delete unavailable — no storage provider configured', { storageKey });
      return { status: 'unavailable' };
    }

    const result = await cloudinary.uploader.destroy(storageKey, { resource_type: 'image' });
    return { status: result.result === 'ok' ? 'deleted' : 'not_found' };
  },

  /** Resolves a stored reference to a public URL. Unconfigured storage has no URL to give. */
  getImageUrl(storageKey) {
    if (!isConfigured) return null;
    return cloudinary.url(storageKey, { secure: true, resource_type: 'image' });
  },
};
