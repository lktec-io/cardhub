import { ApiError } from '../utils/ApiError.js';
import { ERROR_CODES } from '../constants/errorCodes.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

function normalizeError(err) {
  if (err instanceof ApiError) return err;

  if (err.name === 'TokenExpiredError') {
    return ApiError.unauthorized('Session expired, please log in again');
  }
  if (err.name === 'JsonWebTokenError') {
    return ApiError.unauthorized('Invalid authentication token');
  }
  if (err.code === 'ER_DUP_ENTRY') {
    return ApiError.conflict('A record with these details already exists');
  }
  if (err.name === 'SyntaxError' && 'body' in err) {
    return ApiError.badRequest('Malformed JSON in request body');
  }

  return ApiError.internal();
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const apiError = normalizeError(err);
  const isServerError = apiError.statusCode >= 500;

  logger[isServerError ? 'error' : 'warn']('Request failed', {
    method: req.method,
    path: req.originalUrl,
    statusCode: apiError.statusCode,
    code: apiError.code,
    message: err.message,
    ...(env.isProd ? {} : { stack: err.stack }),
  });

  res.status(apiError.statusCode).json({
    success: false,
    message: isServerError && env.isProd ? 'Something went wrong' : apiError.message,
    error: {
      code: apiError.code || ERROR_CODES.INTERNAL_ERROR,
      details: apiError.details || [],
    },
  });
}
