import { env } from '../config/env.js';

const LEVELS = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
const CURRENT_LEVEL = env.isProd ? 'INFO' : 'DEBUG';

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordHash',
  'password_hash',
  'accessToken',
  'refreshToken',
  'authorization',
  'jwtAccessSecret',
  'jwtRefreshSecret',
]);

function redact(meta) {
  if (!meta || typeof meta !== 'object') return meta;
  return Object.fromEntries(
    Object.entries(meta).map(([key, value]) => [key, SENSITIVE_KEYS.has(key) ? '[REDACTED]' : value])
  );
}

function log(level, message, meta) {
  if (LEVELS.indexOf(level) > LEVELS.indexOf(CURRENT_LEVEL)) return;

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(meta ? { meta: redact(meta) } : {}),
  };

  const line = JSON.stringify(entry);
  if (level === 'ERROR') console.error(line);
  else if (level === 'WARN') console.warn(line);
  else console.log(line);
}

export const logger = {
  error: (message, meta) => log('ERROR', message, meta),
  warn: (message, meta) => log('WARN', message, meta),
  info: (message, meta) => log('INFO', message, meta),
  debug: (message, meta) => log('DEBUG', message, meta),
};
