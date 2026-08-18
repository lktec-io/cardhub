import dotenv from 'dotenv';

dotenv.config();

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const isProd = process.env.NODE_ENV === 'production';

// Falls back to the real CardHub domain in production so CORS/links never
// silently default to localhost if an operator forgets to set the env var;
// local development (NODE_ENV !== 'production') keeps the localhost default.
const DEFAULT_FRONTEND_URL = isProd ? 'https://cardhub.co.tz' : 'http://localhost:5173';
const DEFAULT_API_URL = isProd ? 'https://cardhub.co.tz/api/v1' : 'http://localhost:4006/api/v1';

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd,
  port: Number(process.env.PORT) || 4006,

  db: {
    host: required('DB_HOST', 'localhost'),
    port: Number(process.env.DB_PORT) || 3306,
    name: required('DB_NAME', 'cardhub'),
    user: required('DB_USER', 'root'),
    password: process.env.DB_PASSWORD || '',
  },

  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET', 'dev-access-secret'),
    refreshSecret: required('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '30d',
  },

  // Customer-uploaded images (services/providers/imageStorageProvider.js).
  // Backend-only — the API secret is never sent to, or reachable from, the
  // React app. Separate from public/cards/ (the manually-supplied
  // catalogue images), which don't go through Cloudinary at all.
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },

  // Reserved for Phase 7+ — no provider connected. See services/providers/.
  email: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 0,
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    fromAddress: process.env.SMTP_FROM_ADDRESS || '',
  },
  // Beem (beem.africa) is CardHub's chosen SMS provider — see
  // services/providers/smsProvider.js. `apiKey`/`secretKey` are Beem's
  // Basic Auth credential pair, kept backend-only; no credentials exist in
  // this environment and none were invented.
  sms: {
    apiKey: process.env.BEEM_API_KEY || '',
    secretKey: process.env.BEEM_SECRET_KEY || '',
    senderId: process.env.BEEM_SENDER_ID || '',
  },
  // Reserved — no WhatsApp provider chosen/connected yet. The abstraction
  // (services/providers/whatsappProvider.js) is provider-agnostic by
  // design so either Beem's WhatsApp API or Meta's WhatsApp Cloud API can
  // be wired in later without changing any caller.
  whatsapp: {
    provider: process.env.WHATSAPP_PROVIDER || '',
    apiKey: process.env.WHATSAPP_API_KEY || '',
    apiSecret: process.env.WHATSAPP_API_SECRET || '',
    senderId: process.env.WHATSAPP_SENDER_ID || '',
  },

  frontendUrl: process.env.FRONTEND_URL || DEFAULT_FRONTEND_URL,
  apiUrl: process.env.API_URL || DEFAULT_API_URL,
};
