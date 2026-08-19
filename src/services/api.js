import axios from 'axios';
import { env } from '../config/env';
import { STORAGE_KEYS } from '../constants/storageKeys';

export const api = axios.create({
  baseURL: env.apiUrl,
  withCredentials: true,
  timeout: 15000,
  // axios's default validateStatus only resolves 2xx — a legitimate HTTP
  // 304 Not Modified (which this JSON API can produce via a conditional
  // GET, see backend/src/app.js) would otherwise reject the promise and
  // surface as a false "couldn't load" error even though the server is
  // healthy. Treated as non-fatal defensively here; the backend has since
  // also disabled ETag/caching for this API so a 304 shouldn't occur at
  // all in practice.
  validateStatus: (status) => (status >= 200 && status < 300) || status === 304,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let onUnauthorized = null;

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

const AUTH_ENDPOINTS_WITHOUT_RETRY = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

function isRetryExempt(url = '') {
  return AUTH_ENDPOINTS_WITHOUT_RETRY.some((path) => url.includes(path));
}

let refreshPromise = null;

function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = api
      .post('/auth/refresh')
      .then((res) => {
        const token = res.data.data.accessToken;
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
        return token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (status !== 401 || !originalRequest || isRetryExempt(originalRequest.url)) {
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      onUnauthorized?.();
      return Promise.reject(error);
    }
    originalRequest._retry = true;

    try {
      const token = await refreshAccessToken();
      originalRequest.headers.Authorization = `Bearer ${token}`;
      return api(originalRequest);
    } catch (refreshError) {
      onUnauthorized?.();
      return Promise.reject(refreshError);
    }
  }
);
