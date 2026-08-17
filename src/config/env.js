// Falls back to the real CardHub API in a production build even if
// VITE_API_URL wasn't injected at build time; local dev keeps localhost.
const DEFAULT_API_URL = import.meta.env.PROD
  ? 'https://cardhub.co.tz/api/v1'
  : 'http://localhost:4006/api/v1';

export const env = {
  apiUrl: import.meta.env.VITE_API_URL || DEFAULT_API_URL,
  appName: 'CardHub',
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
};
