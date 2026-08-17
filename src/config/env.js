export const env = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1',
  appName: 'CardHub',
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
};
