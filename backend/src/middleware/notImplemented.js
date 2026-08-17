import { ApiError } from '../utils/ApiError.js';

/**
 * Placeholder handler for future-phase API modules. Establishes the route
 * so the frontend/infra can be wired against a stable path, without faking
 * business logic that doesn't exist yet.
 */
export function notImplemented(moduleName) {
  return function notImplementedHandler(req, res, next) {
    next(ApiError.notImplemented(`${moduleName} module is scheduled for a later CardHub phase`));
  };
}
