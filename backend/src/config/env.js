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

/**
 * Guards against a malformed single-value env var — e.g. a `.env` line
 * accidentally set to a comma-separated list (`FRONTEND_URL=https://cardhub.co.tz,http://localhost`,
 * perhaps copied from a CORS-origins-style value elsewhere) or with a
 * stray trailing character from a shell paste. Takes the first
 * comma-separated segment and strips whitespace/angle brackets, so a
 * mis-set value degrades to "first URL, cleaned up" instead of silently
 * producing a broken link like "https://cardhub.co.tz,http://localhost/card/...".
 * This does not fix a bad value at its source — clean up the real .env too.
 */
function firstCleanUrl(value) {
  if (!value) return value;
  return value.split(',')[0].trim().replace(/[<>]/g, '');
}

/** Credential env vars are trimmed defensively — a trailing newline/space from a copy-paste is a common, silent cause of a provider's 401. */
function trimmed(value) {
  return typeof value === 'string' ? value.trim() : value;
}

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
  // Basic Auth credential pair, kept backend-only. Also reused as-is for
  // Beem's WhatsApp ("Moja") API below — Beem's docs confirm it's the
  // same account-level key pair, not a separate WhatsApp credential.
  sms: {
    apiKey: trimmed(process.env.BEEM_API_KEY) || '',
    secretKey: trimmed(process.env.BEEM_SECRET_KEY) || '',
    senderId: trimmed(process.env.BEEM_SENDER_ID) || '',
  },
  // WhatsApp — services/providers/whatsappProvider.js. `provider` selects
  // the transport: 'beem' uses Beem's own WhatsApp/Moja API (reuses the
  // sms.apiKey/secretKey pair above, plus `beemFrom` — the WhatsApp
  // sender identity registered on the Beem account); 'meta' uses the
  // official Meta WhatsApp Cloud API directly, kept as a real, working
  // alternative even though CardHub is standardized on Beem for Phase 2.
  // Unofficial WhatsApp Web automation/scraping was never an option
  // either way. No credentials exist in this environment and none were
  // invented; leaving these unset keeps `isConfigured` false and every
  // send honestly "unavailable".
  whatsapp: {
    provider: trimmed(process.env.WHATSAPP_PROVIDER) || '',
    beemFrom: trimmed(process.env.BEEM_WHATSAPP_FROM) || '',
    accessToken: trimmed(process.env.WHATSAPP_ACCESS_TOKEN) || '',
    phoneNumberId: trimmed(process.env.WHATSAPP_PHONE_NUMBER_ID) || '',
    businessAccountId: trimmed(process.env.WHATSAPP_BUSINESS_ACCOUNT_ID) || '',
    apiVersion: trimmed(process.env.WHATSAPP_API_VERSION) || 'v21.0',
       webhookVerifyToken: trimmed(process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) || 'mimi_ndio_cardhub_2026',
  },

  // Payments (Phase 3) — services/providers/paymentProvider.js. No
  // gateway is connected in this environment and none were invented.
  // `provider` selects the transport; only 'beem' is planned (reusing
  // the same Beem account as SMS/WhatsApp above), but its exact
  // collection-initiation endpoint/payload isn't documented anywhere
  // this integration could verify — see paymentProvider.js's comment.
  // Leaving PAYMENT_PROVIDER unset keeps isConfigured false and every
  // checkout honestly reports "unavailable" rather than faking a charge.
  payment: {
    provider: trimmed(process.env.PAYMENT_PROVIDER) || '',
    apiKey: trimmed(process.env.BEEM_API_KEY) || '',
    secretKey: trimmed(process.env.BEEM_SECRET_KEY) || '',
    webhookSecret: trimmed(process.env.PAYMENT_WEBHOOK_SECRET) || '',
    callbackUrl: firstCleanUrl(process.env.PAYMENT_CALLBACK_URL) || '',
  },

  frontendUrl: firstCleanUrl(process.env.FRONTEND_URL) || DEFAULT_FRONTEND_URL,
  apiUrl: firstCleanUrl(process.env.API_URL) || DEFAULT_API_URL,
};
