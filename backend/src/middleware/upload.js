import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Real validation, independent of whether a storage provider is
 * configured — rejects disallowed mime types and oversized files before
 * the request body is ever fully buffered or handed to
 * imageStorageProvider. Memory storage only (never written to disk): the
 * file either goes to a real provider or is discarded, never left on this
 * server's filesystem.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
  fileFilter(req, file, cb) {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(ApiError.badRequest('Only JPEG, PNG, or WEBP images are allowed'));
      return;
    }
    cb(null, true);
  },
});

export function singleImageUpload(fieldName) {
  const handler = upload.single(fieldName);
  return function uploadMiddleware(req, res, next) {
    handler(req, res, (error) => {
      if (!error) return next();
      if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        return next(ApiError.badRequest('Image is too large — the limit is 5MB'));
      }
      next(error);
    });
  };
}

export { MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPES };
