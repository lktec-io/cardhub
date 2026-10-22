import { randomUUID } from 'node:crypto';
import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';
import { MEDIA_KINDS, mediaStorage } from '../services/providers/mediaStorage.js';

/**
 * Streams an admin upload straight to a temp file on disk (never fully in
 * memory, so large videos are safe), under a random name. The handler
 * then calls mediaStorage.commit(), which checks the real file type and
 * moves it into place. The browser-supplied MIME type is only used for an
 * early, cheap rejection; it is never trusted.
 */
export function singleMediaUpload(fieldName, kind) {
  const spec = MEDIA_KINDS[kind];
  const upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        mediaStorage
          .ensureReady()
          .then(() => cb(null, mediaStorage.tempDir))
          .catch(cb);
      },
      filename: (req, file, cb) => cb(null, `${randomUUID()}.upload`),
    }),
    limits: { fileSize: spec.maxBytes, files: 1, fields: 20 },
    fileFilter(req, file, cb) {
      if (!file.mimetype.startsWith(`${kind}/`)) {
        cb(ApiError.badRequest(`Please upload a ${kind} file`));
        return;
      }
      cb(null, true);
    },
  });
  const handler = upload.single(fieldName);

  return function mediaUploadMiddleware(req, res, next) {
    handler(req, res, (error) => {
      if (!error) return next();
      if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        return next(ApiError.badRequest(`File is too large — the limit is ${Math.round(spec.maxBytes / 1024 / 1024)} MB`));
      }
      next(error);
    });
  };
}
