export function sendSuccess(res, { statusCode = 200, message = 'Request successful', data = null } = {}) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

export function sendError(res, { statusCode = 500, message = 'Something went wrong', code = 'INTERNAL_ERROR', details = [] } = {}) {
  return res.status(statusCode).json({
    success: false,
    message,
    error: { code, details },
  });
}
