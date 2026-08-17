import { authService } from '../services/auth.service.js';
import {
  validateRegisterPayload,
  validateLoginPayload,
  validateForgotPasswordPayload,
  validateResetPasswordPayload,
} from '../validators/auth.validator.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';
import { env } from '../config/env.js';

const REFRESH_COOKIE = 'cardhub_refresh_token';

const refreshCookieOptions = {
  httpOnly: true,
  secure: env.isProd,
  sameSite: 'lax',
  path: '/api/v1/auth',
};

function requestMetaFrom(req) {
  return { ipAddress: req.ip, userAgent: req.headers['user-agent'] };
}

export const authController = {
  register: asyncHandler(async (req, res) => {
    validateRegisterPayload(req.body);
    const { user, accessToken, refreshToken } = await authService.register(req.body, requestMetaFrom(req));
    res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions);
    sendSuccess(res, { statusCode: 201, message: 'Account created successfully', data: { user, accessToken } });
  }),

  login: asyncHandler(async (req, res) => {
    validateLoginPayload(req.body);
    const { user, accessToken, refreshToken } = await authService.login(req.body, requestMetaFrom(req));
    res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions);
    sendSuccess(res, { message: 'Logged in successfully', data: { user, accessToken } });
  }),

  refresh: asyncHandler(async (req, res) => {
    const { user, accessToken, refreshToken } = await authService.refresh(
      req.cookies?.[REFRESH_COOKIE],
      requestMetaFrom(req)
    );
    res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions);
    sendSuccess(res, { message: 'Session refreshed', data: { user, accessToken } });
  }),

  logout: asyncHandler(async (req, res) => {
    await authService.logout(req.cookies?.[REFRESH_COOKIE]);
    res.clearCookie(REFRESH_COOKIE, refreshCookieOptions);
    sendSuccess(res, { message: 'Logged out successfully' });
  }),

  me: asyncHandler(async (req, res) => {
    const user = await authService.me(req.user.id);
    sendSuccess(res, { data: user });
  }),

  forgotPassword: asyncHandler(async (req, res) => {
    validateForgotPasswordPayload(req.body);
    const result = await authService.forgotPassword(req.body.email, requestMetaFrom(req));
    sendSuccess(res, { message: result.message, data: env.isProd ? null : { resetUrl: result.resetUrl } });
  }),

  resetPassword: asyncHandler(async (req, res) => {
    validateResetPasswordPayload(req.body);
    const result = await authService.resetPassword(req.body, requestMetaFrom(req));
    sendSuccess(res, { message: result.message });
  }),
};
