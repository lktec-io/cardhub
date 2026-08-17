import { usersService } from '../services/users.service.js';
import {
  validateUpdateProfilePayload,
  validateChangePasswordPayload,
  validateUpdatePreferencesPayload,
} from '../validators/users.validator.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';

function requestMetaFrom(req) {
  return { ipAddress: req.ip, userAgent: req.headers['user-agent'] };
}

export const usersController = {
  updateMe: asyncHandler(async (req, res) => {
    validateUpdateProfilePayload(req.body);
    const user = await usersService.updateProfile(req.user.id, req.body);
    sendSuccess(res, { message: 'Profile updated successfully', data: user });
  }),

  changePassword: asyncHandler(async (req, res) => {
    validateChangePasswordPayload(req.body);
    const result = await usersService.changePassword(req.user.id, req.body, requestMetaFrom(req));
    sendSuccess(res, { message: result.message });
  }),

  getPreferences: asyncHandler(async (req, res) => {
    const preferences = await usersService.getPreferences(req.user.id);
    sendSuccess(res, { data: preferences });
  }),

  updatePreferences: asyncHandler(async (req, res) => {
    validateUpdatePreferencesPayload(req.body);
    const result = await usersService.updatePreferences(req.user.id, req.body);
    sendSuccess(res, { message: 'Preferences updated successfully', data: result });
  }),
};
