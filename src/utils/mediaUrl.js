import { env } from '../config/env';

/**
 * Uploaded media (cards, posters, videos) come from the API as same-site
 * paths, e.g. "/api/v1/media/posters/2026/<uuid>.jpg", so they never depend
 * on the server's own API_URL setting. This resolves them against the API
 * base the app is already talking to (VITE_API_URL), which is correct in
 * production (same site) and in development (API on another port).
 */
const MEDIA_PATH = /^\/api\/v1(?=\/media\/)/;

const apiBase = (() => {
  try {
    return new URL(env.apiUrl, window.location.origin).href.replace(/\/+$/, '');
  } catch {
    return '/api/v1';
  }
})();

export function resolveMediaSrc(value) {
  return typeof value === 'string' && MEDIA_PATH.test(value) ? value.replace(MEDIA_PATH, apiBase) : value;
}

/** Rewrites every media path inside an API response body, in place. */
export function absolutizeMediaUrls(data, depth = 0) {
  if (!data || typeof data !== 'object' || depth > 8) return data;
  for (const key of Object.keys(data)) {
    const value = data[key];
    if (typeof value === 'string') data[key] = resolveMediaSrc(value);
    else if (value && typeof value === 'object') absolutizeMediaUrls(value, depth + 1);
  }
  return data;
}
