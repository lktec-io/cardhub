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
  sms: {
    provider: process.env.SMS_PROVIDER || '',
    apiKey: process.env.SMS_API_KEY || '',
    senderId: process.env.SMS_SENDER_ID || '',
  },

  frontendUrl: process.env.FRONTEND_URL || DEFAULT_FRONTEND_URL,
  apiUrl: process.env.API_URL || DEFAULT_API_URL,
};
