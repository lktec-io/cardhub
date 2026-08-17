import { assertDbConnection } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

export const healthController = {
  check: asyncHandler(async (req, res) => {
    try {
      await assertDbConnection();
    } catch {
      throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'CardHub API is running but the database is unreachable');
    }

    sendSuccess(res, {
      message: 'CardHub API is healthy',
      data: { status: 'ok', database: 'connected', timestamp: new Date().toISOString() },
    });
  }),
};
